# fugu-sdk

Minimal Python client for the FUGU routed RAG API.

## Usage

```python
from fugu_sdk import FuguClient

client = FuguClient(api_key="fugu_sk_...")
result = client.query("what does FUGU combine to answer questions")
print(result.answer)
```

Pass `base_url` to point at a non-default deployment:

```python
FuguClient(api_key="...", base_url="https://api.example.com/api")
```

## Example

See [examples/basic_query.py](examples/basic_query.py). Run with:

```bash
pip install -e .
FUGU_API_KEY=fugu_sk_... python examples/basic_query.py
```
