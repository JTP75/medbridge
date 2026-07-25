"""Access-request lifecycle endpoints.

Implements the contract from architecture.md's "Provider-Node FastAPI
Contract" and "Decentralized Access-Request Lifecycle" sections. This node
is the source of truth for every request addressed to it; a hospital
reviewer UI (stub — see PLAN.md's "hospital server portal" mini-UX) is meant
to call these same endpoints directly.

Owner: Yizhen (tier/decision policy), Justin (contract boundary with the
Portal), Agnel (schema fields).
"""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from medbridge_schema import AccessRequest, AccessRequestStatus

from ..config import NodeConfig, get_node_config
from ..domain import store

router = APIRouter(prefix="/api/access", tags=["access"])


class DecisionRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    decision_note: Optional[str] = None


class AdditionalInformationRequest(BaseModel):
    note: str


@router.get("/config")
def access_config(config: NodeConfig = Depends(get_node_config)) -> dict:
    return {
        "node_id": config.node_id,
        "maximum_data_level": config.maximum_data_level,
        "access_contact": config.access_contact.model_dump(),
    }


@router.post("/requests", response_model=AccessRequest, status_code=201)
def create_request(
    payload: AccessRequest, config: NodeConfig = Depends(get_node_config)
) -> AccessRequest:
    if payload.requested_node_id != config.node_id:
        raise HTTPException(
            status_code=400,
            detail=(
                f"requested_node_id '{payload.requested_node_id}' does not "
                f"match this node ('{config.node_id}')"
            ),
        )
    if payload.requested_data_level != "deidentified":
        raise HTTPException(
            status_code=400,
            detail="only 'deidentified' access is supported by any tier",
        )
    return store.create_access_request(payload)


@router.get("/requests", response_model=list[AccessRequest])
def list_requests() -> list[AccessRequest]:
    return store.list_access_requests()


@router.get("/requests/{request_id}", response_model=AccessRequest)
def get_request(request_id: str) -> AccessRequest:
    req = store.get_access_request(request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="request not found")
    return req


@router.post("/requests/{request_id}/decision", response_model=AccessRequest)
def decide_request(request_id: str, decision: DecisionRequest) -> AccessRequest:
    existing = store.get_access_request(request_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="request not found")
    updated = store.update_access_request(
        request_id,
        status=AccessRequestStatus(decision.decision),
        decision_note=decision.decision_note,
    )
    assert updated is not None
    return updated


@router.post(
    "/requests/{request_id}/additional-information", response_model=AccessRequest
)
def request_more_information(
    request_id: str, info: AdditionalInformationRequest
) -> AccessRequest:
    existing = store.get_access_request(request_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="request not found")
    updated = store.update_access_request(
        request_id,
        status=AccessRequestStatus.more_information_requested,
        decision_note=info.note,
    )
    assert updated is not None
    return updated
