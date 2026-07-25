"""Discovery endpoints — GA4GH-Beacon-style counts only, never records.

Owner: Agnel/Jaewon for the domain logic these call into (adapter, ontology,
policy); Justin for this contract boundary with the Portal.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from medbridge_schema import DiscoveryQuery, SearchResponse

from ..config import NodeConfig, get_node_config
from ..domain import policy, store

router = APIRouter(prefix="/api/beacon", tags=["beacon"])


@router.get("/info")
def beacon_info(config: NodeConfig = Depends(get_node_config)) -> dict:
    return {
        "node_id": config.node_id,
        "record_count": store.record_count(),
        "access_request_supported": True,
    }


@router.post("/query", response_model=SearchResponse)
def beacon_query(
    query: DiscoveryQuery, config: NodeConfig = Depends(get_node_config)
) -> SearchResponse:
    raw_count = store.count_matching(query)
    match = policy.apply_suppression(raw_count, config.small_cohort_threshold)
    return SearchResponse(
        query_id=query.query_id,
        node_id=config.node_id,
        match=match,
        available_data=["deidentified-imaging-metadata"],
        access_request_supported=True,
    )
