"""Access-request routing between the two Portal views and the owning
hospital node.

- Requester-facing: create a request, poll its status (`/access-requests/*`).
- Hospital-reviewer-facing: per-node queue + decide/more-info
  (`/nodes/{node_id}/requests/*`) — the Portal frontend's reviewer view is a
  thin client over these, proxying straight through to that node's own
  `/api/access/*` endpoints (the node remains the source of truth; see
  architecture.md's Decentralized Access-Request Lifecycle).

Owner: Yizhen (tier/decision policy surfaced here), Justin (contract
boundary + routing).
"""

from __future__ import annotations

import asyncio
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from medbridge_schema import AccessRequest

from .. import tiers
from ..config import NodeEndpoint, get_node, get_nodes

router = APIRouter(prefix="/api/portal", tags=["access"])

_REQUEST_TIMEOUT_SECONDS = 5.0


class DecisionRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    decision_note: Optional[str] = None


class AdditionalInformationRequest(BaseModel):
    note: str


def _require_node(node_id: str) -> NodeEndpoint:
    node = get_node(node_id)
    if node is None:
        raise HTTPException(status_code=404, detail=f"unknown node_id '{node_id}'")
    return node


def _raise_for_node_status(resp: httpx.Response) -> None:
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="request not found")
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)


async def _node_directory_entry(
    client: httpx.AsyncClient, node: NodeEndpoint
) -> dict:
    """Return public node metadata without failing the whole directory."""
    try:
        response = await client.get(
            f"{node.base_url}/api/beacon/info",
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        info = response.json()
        return {
            "node_id": node.node_id,
            "base_url": node.base_url,
            "record_count": info.get("record_count"),
            "access_request_supported": info.get(
                "access_request_supported", False
            ),
            "status": "online",
        }
    except (httpx.HTTPError, ValueError):
        return {
            "node_id": node.node_id,
            "base_url": node.base_url,
            "record_count": None,
            "access_request_supported": False,
            "status": "unavailable",
        }


@router.get("/nodes")
async def list_nodes() -> list[dict]:
    nodes = get_nodes()
    async with httpx.AsyncClient() as client:
        return await asyncio.gather(
            *(_node_directory_entry(client, node) for node in nodes)
        )


@router.post("/access-requests", response_model=AccessRequest, status_code=201)
async def create_access_request(payload: AccessRequest) -> AccessRequest:
    try:
        payload = tiers.enforce_access_request_policy(payload)
    except tiers.TierPolicyViolation as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    node = _require_node(payload.requested_node_id)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{node.base_url}/api/access/requests",
            json=payload.model_dump(mode="json", exclude_none=True),
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
    _raise_for_node_status(resp)
    return AccessRequest.model_validate(resp.json())


@router.get("/access-requests/{node_id}/{request_id}", response_model=AccessRequest)
async def get_access_request(node_id: str, request_id: str) -> AccessRequest:
    node = _require_node(node_id)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{node.base_url}/api/access/requests/{request_id}",
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
    _raise_for_node_status(resp)
    return AccessRequest.model_validate(resp.json())


@router.get("/nodes/{node_id}/requests", response_model=list[AccessRequest])
async def list_node_requests(node_id: str) -> list[AccessRequest]:
    node = _require_node(node_id)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{node.base_url}/api/access/requests", timeout=_REQUEST_TIMEOUT_SECONDS
        )
    _raise_for_node_status(resp)
    return [AccessRequest.model_validate(r) for r in resp.json()]


@router.post(
    "/nodes/{node_id}/requests/{request_id}/decision", response_model=AccessRequest
)
async def decide_node_request(
    node_id: str, request_id: str, decision: DecisionRequest
) -> AccessRequest:
    node = _require_node(node_id)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{node.base_url}/api/access/requests/{request_id}/decision",
            json=decision.model_dump(),
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
    _raise_for_node_status(resp)
    return AccessRequest.model_validate(resp.json())


@router.post(
    "/nodes/{node_id}/requests/{request_id}/additional-information",
    response_model=AccessRequest,
)
async def request_more_information(
    node_id: str, request_id: str, info: AdditionalInformationRequest
) -> AccessRequest:
    node = _require_node(node_id)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{node.base_url}/api/access/requests/{request_id}/additional-information",
            json=info.model_dump(),
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
    _raise_for_node_status(resp)
    return AccessRequest.model_validate(resp.json())
