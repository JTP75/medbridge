"""Raw hospital StudyRecord -> privacy-safe ImagingRecord.

Owner: Agnel (schema/adapter lead), with Jaewon on field mapping.

Reads a hospital's raw synthetic-DICOM study record (see `../../../data/*.json`,
generated from the `provider-node` boilerplate) and projects it onto
`ImagingRecord` (schema/schemas/imaging_record.schema.json). Every PII field
(PatientName, PatientID, PatientBirthDate, StudyInstanceUID, StudyID,
free-text Diagnosis, exact PatientAge/StudyDate) is discarded by virtue of
never being read into the output -- only bucketed/coarsened derivatives are.

`ImagingRecord` has `extra='forbid'`, so any field not in the schema would
raise a validation error rather than leak silently -- but that is a backstop,
not the primary safeguard: this function only ever constructs the fields it
means to expose.
"""

from __future__ import annotations

from typing import Any

from medbridge_schema import ImagingRecord

from . import ontology

# Age bands mirror imaging_record.schema.json (upper bound inclusive, in years).
_AGE_BANDS: list[tuple[float, str]] = [
    (1, "0-1"),
    (5, "2-5"),
    (12, "6-12"),
    (21, "13-21"),
    (40, "22-40"),
    (64, "41-64"),
    (89, "65-89"),
    (float("inf"), "90+"),
]

# Raw DICOM BodyPartExamined -> schema body_part vocabulary.
_BODY_PART_MAP = {
    "BRAIN": "BRAIN",
    "HEART": "HEART",
    "FETAL": "FETAL",
    "CHEST": "CHEST",
    "ABDOMEN": "ABDOMEN",
    "SPINE": "SPINE",
}


def _age_years(patient_age: str) -> float:
    """Convert a DICOM age string ('005D', '068M', '020Y') to a year value.

    D = days, M = months, Y = years (default). Returns 0.0 on unparseable input.
    """
    if not patient_age:
        return 0.0
    value_part, unit = patient_age[:-1], patient_age[-1].upper()
    try:
        value = int(value_part)
    except ValueError:
        return 0.0
    if unit == "D":
        return value / 365.0
    if unit == "M":
        return value / 12.0
    return float(value)  # 'Y' or unknown unit -> treat as years


def _age_band(years: float) -> str:
    for upper, band in _AGE_BANDS:
        if years <= upper:
            return band
    return "90+"


def _acquisition_year(study_date: str) -> int:
    """Coarsen a DICOM YYYYMMDD date to its year. 2000 (schema floor) on bad input."""
    if study_date and len(study_date) >= 4 and study_date[:4].isdigit():
        return int(study_date[:4])
    return 2000


def _sex(patient_sex: str) -> str:
    s = (patient_sex or "").upper()
    return s if s in {"F", "M", "O"} else "U"


def _body_part(body_part: str) -> str:
    return _BODY_PART_MAP.get((body_part or "").upper(), "OTHER")


def _modality(modality: str) -> str:
    m = (modality or "").upper()
    valid = {"MR", "CT", "US", "XR", "PT", "NM", "MG", "OT"}
    return m if m in valid else "OT"


def raw_record_to_imaging_record(raw: dict[str, Any], node_id: str) -> ImagingRecord:
    """Project one raw StudyRecord onto ImagingRecord for the given node.

    Guardrails (see architecture.md's "Two Schema Layers" and MENTOR_NOTES.md):
      - PatientName, PatientID, PatientBirthDate, StudyInstanceUID, StudyID,
        and free-text Diagnosis are never read into the output.
      - Ages are bucketed (never an exact age or birthdate).
      - Only the acquisition YEAR survives, never an exact date.
      - Free-text diagnosis is run through `ontology.normalize_condition`,
        never forwarded verbatim.
    """
    return ImagingRecord(
        node_id=node_id,
        modality=_modality(raw.get("Modality", "")),
        body_part=_body_part(raw.get("BodyPartExamined", "")),
        age_band=_age_band(_age_years(raw.get("PatientAge", ""))),
        sex=_sex(raw.get("PatientSex", "")),
        acquisition_year=_acquisition_year(raw.get("StudyDate", "")),
        condition_category=ontology.normalize_condition(raw.get("Diagnosis", "")),
    )


__all__ = ["raw_record_to_imaging_record", "ontology"]
