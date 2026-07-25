"""Boilerplate demo data generator — DELETE once adapter.py is real.

Owner: Agnel + Jaewon.

Generates a small, deterministic, in-memory set of ImagingRecord so this
node has something to answer `/api/beacon/query` against out of the box,
with per-node profiles chosen so every node has at least one "rare"
combination (count < small_cohort_threshold) and one "common" one, to
demonstrate small-cohort suppression end to end without any setup.

Replace this module's role by having `store.load_records()` (see store.py)
call into `adapter.raw_record_to_imaging_record` over real (synthetic)
hospital data instead.
"""

from __future__ import annotations

from medbridge_schema import ImagingRecord

_MODALITIES = ["MR", "CT"]
_BODY_PARTS = ["BRAIN", "CHEST", "ABDOMEN"]
_AGE_BANDS = ["0-1", "2-5", "6-12", "13-17", "18-64", "65+"]
_SEXES = ["F", "M"]

# node_id -> condition_category -> record count.
# Kept intentionally uneven so BCH/MGH/BWH each demo a different suppression
# case in the shared demo (see architecture.md's Demo Sequence).
_NODE_PROFILES: dict[str, dict[str, int]] = {
    "BCH": {"neoplasm": 3, "ischemia": 14, "other": 20},
    "MGH": {"neoplasm": 22, "ischemia": 5, "other": 16},
    "BWH": {"neoplasm": 8, "ischemia": 8, "other": 25},
}
_DEFAULT_PROFILE = {"neoplasm": 5, "ischemia": 12, "other": 18}


def generate_demo_records(node_id: str) -> list[ImagingRecord]:
    profile = _NODE_PROFILES.get(node_id, _DEFAULT_PROFILE)
    records: list[ImagingRecord] = []
    for condition, count in profile.items():
        for i in range(count):
            records.append(
                ImagingRecord(
                    node_id=node_id,
                    modality=_MODALITIES[i % len(_MODALITIES)],
                    body_part=_BODY_PARTS[i % len(_BODY_PARTS)],
                    age_band=_AGE_BANDS[i % len(_AGE_BANDS)],
                    sex=_SEXES[i % len(_SEXES)],
                    acquisition_year=2024 + (i % 3),
                    condition_category=condition,
                )
            )
    return records
