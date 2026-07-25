"""Generic in-memory stores -- boilerplate, not domain-specific.

Record store: populated at startup from this repo's real synthetic dataset
(`../../../data/*_data.json`, 900 records per node) via `adapter.py`.
`count_matching()` only depends on the ImagingRecord shape, not on where the
records came from.

Access-request store: a plain in-memory dict, fine for a one-machine
hackathon demo, not for production. See architecture.md's Post-Hackathon
Production Direction ("Persistent node-local request and audit stores").
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Optional

from medbridge_schema import AccessRequest, AccessRequestStatus, DiscoveryQuery, ImagingRecord

from . import adapter

_DATA_DIR = Path(__file__).resolve().parents[3] / "data"

_records: list[ImagingRecord] = []
_access_requests: dict[str, AccessRequest] = {}


def load_records(node_id: str) -> None:
    """Populate the in-memory record store from this node's real data file.

    Called once at app startup. Raw records never leave this function --
    only their `adapter.raw_record_to_imaging_record` projection is kept.
    """
    global _records
    data_path = _DATA_DIR / f"{node_id.lower()}_data.json"
    with open(data_path) as f:
        raw_records = json.load(f)
    _records = [adapter.raw_record_to_imaging_record(r, node_id) for r in raw_records]


def record_count() -> int:
    return len(_records)


def count_matching(query: DiscoveryQuery) -> int:
    def matches(r: ImagingRecord) -> bool:
        if query.modality and r.modality != query.modality:
            return False
        if query.body_part and r.body_part != query.body_part:
            return False
        if query.age_band and r.age_band != query.age_band:
            return False
        if query.sex and r.sex != query.sex:
            return False
        if query.acquisition_year and r.acquisition_year != query.acquisition_year:
            return False
        if query.condition_category and r.condition_category != query.condition_category:
            return False
        return True

    return sum(1 for r in _records if matches(r))


def create_access_request(payload: AccessRequest) -> AccessRequest:
    request_id = str(uuid.uuid4())
    stored = payload.model_copy(
        update={
            "request_id": request_id,
            "status": AccessRequestStatus.pending_hospital_review,
        }
    )
    _access_requests[request_id] = stored
    return stored


def list_access_requests() -> list[AccessRequest]:
    return list(_access_requests.values())


def get_access_request(request_id: str) -> Optional[AccessRequest]:
    return _access_requests.get(request_id)


def update_access_request(request_id: str, **updates) -> Optional[AccessRequest]:
    existing = _access_requests.get(request_id)
    if existing is None:
        return None
    updated = existing.model_copy(update=updates)
    _access_requests[request_id] = updated
    return updated


def reset_for_tests() -> None:
    """Test-only helper to clear access-request state between tests."""
    _access_requests.clear()
