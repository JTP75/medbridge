"""Fan-out a discovery query to all configured hospital nodes and combine
their privacy-filtered responses.

Owner: Justin. This is generic boilerplate, not a stub: it already
implements architecture.md's hard rule verbatim —

    "If one or more node responses are suppressed, the aggregation service
    must not reconstruct or imply the hidden count."

`total_count` is only populated when every responding node returned a
non-suppressed count; otherwise it is None and `any_suppressed` is True, so
the frontend can render the "Additional matches exist..." message instead
of a number.
"""

from __future__ import annotations

import asyncio
from typing import Any, Union

import httpx

from medbridge_schema import DiscoveryQuery, SearchResponse

from .config import NodeEndpoint

_REQUEST_TIMEOUT_SECONDS = 5.0


class NodeQueryError(Exception):
    def __init__(self, node_id: str, detail: str):
        self.node_id = node_id
        self.detail = detail
        super().__init__(f"node '{node_id}' query failed: {detail}")


async def _query_node(
    client: httpx.AsyncClient, node: NodeEndpoint, query: DiscoveryQuery
) -> SearchResponse:
    try:
        resp = await client.post(
            f"{node.base_url}/api/beacon/query",
            json=query.model_dump(mode="json", exclude_none=True),
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        return SearchResponse.model_validate(resp.json())
    except httpx.HTTPError as exc:
        raise NodeQueryError(node.node_id, str(exc)) from exc


async def fan_out(
    nodes: list[NodeEndpoint], query: DiscoveryQuery
) -> list[tuple[NodeEndpoint, Union[SearchResponse, NodeQueryError]]]:
    async with httpx.AsyncClient() as client:
        outcomes = await asyncio.gather(
            *(_query_node(client, node, query) for node in nodes),
            return_exceptions=True,
        )
    return list(zip(nodes, outcomes))


def aggregate(
    results: list[tuple[NodeEndpoint, Union[SearchResponse, NodeQueryError]]],
) -> dict[str, Any]:
    node_responses: list[dict[str, Any]] = []
    node_errors: list[dict[str, str]] = []
    total_count = 0
    all_counted = True
    any_suppressed = False

    for node, outcome in results:
        if isinstance(outcome, Exception):
            node_errors.append({"node_id": node.node_id, "error": str(outcome)})
            all_counted = False
            continue

        node_responses.append(outcome.model_dump(mode="json"))
        if outcome.match.suppressed or outcome.match.count is None:
            any_suppressed = True
            all_counted = False
        else:
            total_count += outcome.match.count

    return {
        "total_count": total_count if all_counted else None,
        "any_suppressed": any_suppressed,
        "node_responses": node_responses,
        "node_errors": node_errors,
        "message": (
            "Additional matches exist at one or more participating hospitals."
            if any_suppressed
            else None
        ),
    }
