import re
from datetime import datetime
from typing import Any, Mapping


PROVIDER_MAP = {
    "Boston Children's Hospital": "BCH",
    "Massachusetts General Hospital": "MGH",
    "Brigham and Women's Hospital": "BWH",
}

MODALITY_MAP = {
    # Preserve standard DICOM modality codes used by provider-node.
    "MR": "MR",
    "CT": "CT",
}

BODY_REGION_MAP = {
    "BRAIN": "brain",
    "HEART": "heart",
    "FETAL": "fetal",
}

SEX_MAP = {
    "M": "male",
    "F": "female",
}


def parse_patient_age(value: object) -> dict[str, Any]:
    """
    Convert DICOM-style age values:
    007Y -> 7 years
    005M -> 5 months
    010D -> 10 days
    """
    normalized = str(value or "").strip().upper()
    match = re.fullmatch(r"(\d{3})([YMD])", normalized)

    if not match:
        return {
            "age_value": None,
            "age_unit": None,
            "age_group": "unknown",
        }

    age_value = int(match.group(1))
    unit_code = match.group(2)

    unit_map = {
        "Y": "years",
        "M": "months",
        "D": "days",
    }

    age_unit = unit_map[unit_code]

    if unit_code in {"M", "D"}:
        age_group = "pediatric"
    elif age_value <= 21:
        age_group = "pediatric"
    else:
        age_group = "adult"

    return {
        "age_value": age_value,
        "age_unit": age_unit,
        "age_group": age_group,
    }


def _normalized_code(value: object) -> str:
    return str(value or "").strip().upper()


def _parse_study_year(value: object) -> int | None:
    normalized = str(value or "").strip()
    try:
        return datetime.strptime(normalized, "%Y%m%d").year
    except ValueError:
        return None


def map_study_to_schema(raw_study: Mapping[str, Any]) -> dict[str, Any]:
    """Map one provider-node record to privacy-safe, provisional schema fields.

    Direct identifiers such as PatientName, PatientID, birth date, and DICOM
    StudyInstanceUID are deliberately omitted.
    """
    age = parse_patient_age(raw_study.get("PatientAge", ""))

    institution = str(raw_study.get("InstitutionName") or "").strip()
    sex = _normalized_code(raw_study.get("PatientSex"))
    modality = _normalized_code(raw_study.get("Modality"))
    body_region = _normalized_code(raw_study.get("BodyPartExamined"))

    return {
        # StudyID is a synthetic/provider-scoped lookup key, not PatientID.
        "study_id": str(raw_study.get("StudyID") or "").strip() or None,
        "provider_id": PROVIDER_MAP.get(institution, institution or "unknown"),
        "age_value": age["age_value"],
        "age_unit": age["age_unit"],
        "age_group": age["age_group"],
        "sex": SEX_MAP.get(sex, "unknown"),
        "modality": MODALITY_MAP.get(modality, modality or "unknown"),
        "body_region": BODY_REGION_MAP.get(
            body_region, body_region.lower() or "unknown"
        ),
        "study_year": _parse_study_year(raw_study.get("StudyDate")),
        "diagnosis_text": str(raw_study.get("Diagnosis") or "").strip(),
    }
