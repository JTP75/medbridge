"""Public requester search — fans out to every configured node and returns
an aggregated, privacy-safe result. Owner: Justin (aggregation), Yizhen
(query semantics — currently pass-through of DiscoveryQuery's stub fields).
"""

from __future__ import annotations

from fastapi import APIRouter

from medbridge_schema import DiscoveryQuery

from ..aggregation import aggregate, fan_out
from ..config import get_nodes

router = APIRouter(prefix="/api/portal", tags=["search"])


@router.post("/search")
async def search(query: DiscoveryQuery) -> dict:
    nodes = get_nodes()
    results = await fan_out(nodes, query)
    aggregated = aggregate(results)
    aggregated["query_id"] = query.query_id
    return aggregated
