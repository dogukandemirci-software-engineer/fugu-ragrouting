import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fugu_sdk import FuguClient


def main() -> None:
    api_key = os.environ.get("FUGU_API_KEY")
    if not api_key:
        raise SystemExit("Set FUGU_API_KEY env var to a valid fugu_sk_... key")

    client = FuguClient(
        api_key=api_key,
        base_url=os.environ.get("FUGU_BASE_URL", "http://localhost:3001/api"),
    )

    result = client.query("what does FUGU combine to answer questions")

    print("Answer:", result.answer)
    print("Strategy used:", result.explain.get("strategy_final"))
    print("Sources:", len(result.results))


if __name__ == "__main__":
    main()
