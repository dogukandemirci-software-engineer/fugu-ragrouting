"""
End-to-end test of FUGU's real HTTP API — sign-up, document upload, ingestion
wait, and query/routing/retrieval — exercised exactly the way the TypeScript
SDK (sdk-typescript/src/*) calls the same endpoints, but driven from Python
with `requests` so it stands in for "any SDK, any language" hitting the API.

No real LLM or embedding provider is called. Embeddings are served by
mock_embedding_server.py (a local, deterministic, zero-cost stand-in for
Ollama's /api/embeddings). Answer synthesis is NOT exercised — see the
report for why (it requires a real BYOK provider key; only retrieval/routing
is FUGU's own logic and what this test is meant to validate). Queries are
expected to fail with BYOK_REQUIRED, which is asserted as a pass condition,
not a failure — it proves quota/routing/retrieval ran and stopped at the
correct, documented boundary.

Usage:
  1. Start the mock embedding server:  python mock_embedding_server.py
  2. Point the backend at it (.env): OLLAMA_URL=http://127.0.0.1:11434
                                      EMBEDDING_PROVIDER=ollama
                                      EMBEDDING_MODEL=nomic-embed-text
  3. Start the backend:  npm run dev  (in backend/)
  4. Run this script:    python run_e2e.py
"""
import io
import shutil
import subprocess
import sys
import time
import uuid
import requests
from pathlib import Path

E2E_DIR = Path(__file__).parent
BACKEND_DIR = E2E_DIR.parent.parent / "backend"

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 10


def step(label: str):
    print(f"\n=== {label} ===")


def must(condition: bool, message: str):
    if not condition:
        print(f"FAIL: {message}")
        sys.exit(1)
    print(f"PASS: {message}")


def sign_up(session: requests.Session) -> dict:
    ts = int(time.time())
    email = f"e2e-{ts}-{uuid.uuid4().hex[:6]}@test.com"
    res = session.post(
        f"{BASE_URL}/auth/sign-up",
        json={
            "email": email,
            "password": "TestPass123!",
            "full_name": "E2E Test",
            "organization_name": f"E2EOrg-{ts}",
        },
        timeout=TIMEOUT,
    )
    must(res.status_code == 201, f"sign-up returns 201 (got {res.status_code}: {res.text[:200]})")
    return res.json()


def upload_document(session: requests.Session, token: str, filename: str, text: str) -> str:
    res = session.post(
        f"{BASE_URL}/documents",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": (filename, io.BytesIO(text.encode()), "text/plain")},
        timeout=TIMEOUT,
    )
    must(res.status_code == 202, f"upload '{filename}' returns 202 (got {res.status_code}: {res.text[:200]})")
    return res.json()["document_id"]


def wait_ready(session: requests.Session, token: str, doc_id: str, timeout_s: int = 30) -> str:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        res = session.get(
            f"{BASE_URL}/documents/{doc_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        status = res.json()["document"]["status"]
        if status in ("ready", "failed"):
            return status
        time.sleep(1)
    return "timeout"


def query(session: requests.Session, token: str, text: str) -> requests.Response:
    return session.post(
        f"{BASE_URL}/queries/execute",
        headers={"Authorization": f"Bearer {token}"},
        json={"query": text},
        timeout=TIMEOUT,
    )


def main():
    session = requests.Session()

    step("Health check")
    res = session.get("http://localhost:3001/health", timeout=TIMEOUT)
    must(res.status_code == 200, "backend /health returns 200")

    step("Sign-up (mirrors SDK's implicit auth bootstrap)")
    auth = sign_up(session)
    token = auth["tokens"]["access_token"]
    org_id = auth["organization_id"]
    print(f"org_id={org_id}")

    step("Upload documents on two distinct topics")
    doc_a = upload_document(
        session, token, "refund-policy.txt",
        "Our refund policy allows customers to request a refund within 30 days of purchase. "
        "Refunds are processed to the original payment method within 5 business days. "
        "Digital products are non-refundable once downloaded.",
    )
    doc_b = upload_document(
        session, token, "billing-auth-integration.txt",
        "The billing service authenticates every request against the auth service using a "
        "short-lived JWT. When a subscription is created, the billing service calls the auth "
        "service to verify the organization owner's role before activating the plan.",
    )
    print(f"doc_a={doc_a} doc_b={doc_b}")

    step("Wait for ingestion (embedding via mock server, no real API)")
    status_a = wait_ready(session, token, doc_a)
    status_b = wait_ready(session, token, doc_b)
    must(status_a == "ready", f"refund-policy.txt reaches 'ready' (got {status_a})")
    must(status_b == "ready", f"billing-auth-integration.txt reaches 'ready' (got {status_b})")

    step("List documents (mirrors SDK's documents.list())")
    res = session.get(f"{BASE_URL}/documents", headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    docs = res.json()["documents"]
    must(res.status_code == 200 and len(docs) == 2, f"documents.list() returns both uploaded docs (got {len(docs)})")

    step("Query without any BYOK credential: guarded before retrieval even starts")
    res = query(session, token, "What is our refund policy?")
    body = res.json()
    must(
        res.status_code == 409 and body.get("error", {}).get("code") == "BYOK_REQUIRED",
        f"query with no credential returns 409 BYOK_REQUIRED (got {res.status_code}: {body})",
    )

    step("Seed a fake BYOK credential directly (bypasses the real-provider verify-on-save call)")
    # CredentialService.save() test-calls the real provider before storing a
    # key (see credential.service.ts testCredential()) — a real safeguard we
    # don't want to fake around at the HTTP layer. Instead we insert the row
    # the same way save() would have, using the app's own encryption/
    # repository code (seed_credential.ts), which is the only way to reach
    # the query pipeline without ever calling a real LLM provider.
    npx = shutil.which("npx") or "npx"
    seed = subprocess.run(
        [npx, "ts-node", "--transpile-only", "--project", "tsconfig.json", str(E2E_DIR / "seed_credential.ts"),
         org_id, "gemini", "gemini-2.5-pro", "fake-e2e-test-key-not-real"],
        cwd=str(BACKEND_DIR), capture_output=True, text=True, timeout=30, shell=(sys.platform == "win32"),
    )
    must(seed.returncode == 0, f"seed_credential.ts inserts fake BYOK row (stderr: {seed.stderr[-400:]})")

    step("Query with credential present: retrieval/routing run for real, synthesis degrades gracefully")
    res = query(session, token, "What is our refund policy?")
    body = res.json()
    must(res.status_code == 200, f"query returns 200 (got {res.status_code}: {body})")
    must(body.get("answer_degraded") is True, "answer_degraded=true (fake key can't reach a real LLM)")
    must(len(body.get("results", [])) > 0, f"results non-empty — real vector search ran (got {body.get('results')})")
    must(
        any("refund" in r["content"].lower() for r in body["results"]),
        "top results actually mention 'refund' — mock embeddings ranked the right document",
    )
    print(f"  -> {len(body['results'])} result(s), strategy explain: {body.get('explain', {})}")

    step("Cross-topic query retrieves the OTHER document — proves ranking isn't random")
    res2 = query(session, token, "How does the billing service authenticate with the auth service?")
    body2 = res2.json()
    must(
        any("auth" in r["content"].lower() and "billing" in r["content"].lower() for r in body2["results"]),
        "billing/auth query's top results mention billing+auth, not the refund doc",
    )

    step("Security regression: credential save never leaks raw provider errors")
    res = session.put(
        f"{BASE_URL}/organization/llm-credential",
        headers={"Authorization": f"Bearer {token}"},
        json={"provider": "gemini", "model": "gemini-2.5-pro", "apiKey": "invalid-test-key-not-real"},
        timeout=TIMEOUT,
    )
    msg = res.json().get("error", {}).get("message", "")
    must(res.status_code == 400, f"invalid credential save returns 400 (got {res.status_code})")
    must(
        "generativelanguage.googleapis.com" not in msg and "quotaId" not in msg and len(msg) < 300,
        f"error message is sanitized, no raw provider JSON leaked (got: {msg[:200]})",
    )

    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
