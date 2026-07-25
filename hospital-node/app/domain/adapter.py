"""STUB — owner: Agnel (schema/adapter lead), with Jaewon on field mapping.

This is the seam where real hospital data is meant to enter the system —
reading the hospital's raw database / synthetic-DICOM records (via the
`provider-node` boilerplate) and mapping each row to the schema's safe
`ImagingRecord` shape. Nothing calls this yet: `store.py` currently loads
`demo_data.generate_demo_records()` instead so the node runs out of the box.

To wire in real data: implement `raw_record_to_imaging_record` below, then
change `store.load_records()` in store.py to map over your real raw records
through this function instead of calling `demo_data.generate_demo_records`.
"""

from __future__ import annotations

from typing import Any

from medbridge_schema import ImagingRecord

from . import ontology


def raw_record_to_imaging_record(raw: dict[str, Any]) -> ImagingRecord:
    """STUB: implement the real raw record -> ImagingRecord mapping.

    Guardrails to keep when implementing this for real (see
    architecture.md's "Two Schema Layers" and MENTOR_NOTES.md):
      - Never forward PatientName, PatientID, exact birthdate, or any other
        direct identifier. Do not even read them into a local variable
        beyond what's needed to compute a bucketed value.
      - Bucket ages (e.g. "005D" -> age_band "0-1"), never pass exact ages
        or birthdates through.
      - Use acquisition YEAR only, never an exact date.
      - Run free-text diagnosis through `ontology.normalize_condition(...)`
        rather than forwarding it verbatim.
      - `ImagingRecord` has `extra='forbid'` — any field not in the schema
        will raise validation error rather than leak silently, but do not
        rely on that as your only safeguard; only construct the fields you
        mean to expose.
    """
    raise NotImplementedError(
        "raw_record_to_imaging_record is a stub. Implement the real mapping "
        "from this hospital's raw record shape to ImagingRecord."
    )


__all__ = ["raw_record_to_imaging_record", "ontology"]
