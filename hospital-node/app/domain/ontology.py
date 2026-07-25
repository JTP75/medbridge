"""Free-text diagnosis -> controlled condition_category.

Owner: Jaewon (semantic/ontology mapping).

Keyword-based mapper covering every condition_category value in
imaging_record.schema.json. This is a working default so `adapter.py` has
something real to call; swap the implementation for a real medical-
terminology/ontology lookup (e.g. SNOMED/RadLex concept matching) without
touching call sites -- `normalize_condition`'s signature is the contract.

Order matters: categories are checked most-specific first, and "normal" is
only assigned when nothing pathological matched; anything unmatched falls
back to "other" so every record maps to a valid enum value.
"""

from __future__ import annotations

_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("neoplasm", ("tumor", "tumour", "mass", "neoplasm", "carcinoma", "glioma",
                  "metastas", "lesion suspicious", "malignan", "adenoma")),
    ("hemorrhage", ("hemorrhage", "haemorrhage", "hematoma", "bleed",
                    "subarachnoid", "subdural", "epidural")),
    ("ischemia", ("infarct", "ischemi", "ischaemi", "stroke", "restricted diffusion",
                  "occlusion", "mca territory")),
    ("congenital_anomaly", ("congenital", "malformation", "hydrocephalus",
                            "chiari", "agenesis", "dysplasia", "fetal anomaly",
                            "neural tube", "septal defect")),
    ("inflammatory", ("inflammat", "encephalitis", "myocarditis", "abscess",
                      "infection", "demyelinat", "meningitis")),
    ("degenerative", ("atrophy", "degenerativ", "chronic", "gliosis",
                      "white matter disease")),
    ("normal", ("no acute", "unremarkable", "normal study", "within normal limits",
                "no abnormal", "no significant")),
]

_DEFAULT_CATEGORY = "other"


def normalize_condition(diagnosis_text: str) -> str:
    """Return the condition_category for a free-text radiology report.

    Case-insensitive substring keyword match, first matching category wins,
    else falls back to "other".
    """
    text = (diagnosis_text or "").lower()
    for category, keywords in _KEYWORDS:
        if any(keyword in text for keyword in keywords):
            return category
    return _DEFAULT_CATEGORY
