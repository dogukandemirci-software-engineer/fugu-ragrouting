from dataclasses import dataclass, field
from typing import Any, Literal, Optional

import requests

QueryStrategy = Literal["vector_only", "graph_only", "hybrid", "auto"]


@dataclass
class QuerySource:
    content: str
    source: str
    score: float
    document_id: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class QueryResponse:
    answer: str
    citations: list
    answer_degraded: bool
    results: list
    explain: dict
    quota: dict
    raw: dict = field(default_factory=dict)


class FuguApiError(Exception):
    def __init__(self, message: str, status: int, code: Optional[str] = None):
        super().__init__(message)
        self.status = status
        self.code = code


class FuguClient:
    def __init__(self, api_key: str, base_url: str = "http://localhost:3001/api", timeout: float = 30.0):
        if not api_key:
            raise ValueError("FuguClient requires an api_key")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def query(
        self,
        query: str,
        strategy: Optional[QueryStrategy] = None,
        top_k: Optional[int] = None,
    ) -> QueryResponse:
        payload: dict[str, Any] = {"query": query}
        if strategy is not None:
            payload["strategy"] = strategy
        if top_k is not None:
            payload["top_k"] = top_k

        resp = requests.post(
            f"{self.base_url}/queries/v1/query",
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=self.timeout,
        )

        try:
            body = resp.json()
        except ValueError:
            body = None

        if not resp.ok:
            message = (body or {}).get("error", {}).get("message", f"Request failed with status {resp.status_code}")
            code = (body or {}).get("error", {}).get("code")
            raise FuguApiError(message, resp.status_code, code)

        return QueryResponse(
            answer=body["answer"],
            citations=body["citations"],
            answer_degraded=body["answer_degraded"],
            results=body["results"],
            explain=body["explain"],
            quota=body["quota"],
            raw=body,
        )
