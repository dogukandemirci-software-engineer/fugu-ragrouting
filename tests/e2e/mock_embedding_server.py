"""
Deterministic mock embedding server that mimics Ollama's /api/embeddings
response shape. Point the backend's OLLAMA_URL at this instead of a real
Ollama install so ingestion/query embedding calls resolve locally with zero
network traffic and zero cost — no real LLM/embedding provider is ever hit.

Determinism + semantic-ish behavior: the vector is a bag-of-words hash
embedding (each lowercased word contributes a fixed pseudo-random direction,
summed and normalized) rather than a hash of the whole string. Two texts
sharing vocabulary land closer together in cosine space than two texts that
share nothing — enough structure for a similarity-search test to be
meaningful without needing a real model.
"""
import hashlib
import json
import os
import re
import struct
from http.server import BaseHTTPRequestHandler, HTTPServer

DIM = int(os.environ.get("MOCK_EMBED_DIM", "384"))
STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "of", "in", "on", "to",
    "and", "or", "for", "with", "how", "what", "does", "do", "it", "its",
}


def word_vector(word: str) -> list[float]:
    vec = []
    counter = 0
    while len(vec) < DIM:
        h = hashlib.sha256(f"{word}:{counter}".encode()).digest()
        for i in range(0, len(h), 4):
            if len(vec) >= DIM:
                break
            (val,) = struct.unpack("I", h[i : i + 4])
            vec.append((val / 0xFFFFFFFF) * 2 - 1)
        counter += 1
    return vec


def embed(text: str) -> list[float]:
    words = [w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOPWORDS]
    if not words:
        words = ["empty"]

    acc = [0.0] * DIM
    for w in words:
        wv = word_vector(w)
        for i in range(DIM):
            acc[i] += wv[i]

    norm = sum(x * x for x in acc) ** 0.5
    if norm == 0:
        return acc
    return [x / norm for x in acc]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # keep test output quiet

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        prompt = body.get("prompt", "")
        vector = embed(prompt)

        payload = json.dumps({"embedding": vector}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def serve(port: int = 11434):
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"mock embedding server listening on :{port}, dim={DIM}")
    server.serve_forever()


if __name__ == "__main__":
    serve()
