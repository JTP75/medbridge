"""STUB — owner: Jaewon (semantic/ontology mapping).

Naive keyword-based placeholder for mapping free-text diagnosis into the
schema's `condition_category` buckets. This is a working default so
`adapter.py` has something to call — swap the implementation for a real
medical-terminology mapper (e.g. an ontology/concept lookup) without
touching call sites; the function signature is the contract.
"""

from __future__ import annotations

_KEYWORDS: dict[str, tuple[str, ...]] = {
    "neoplasm": ("tumor", "mass", "neoplasm", "carcinoma", "malignan"),
    "ischemia": ("infarct", "stroke", "ischemia", "ischemic"),
}
_DEFAULT_CATEGORY = "other"


def normalize_condition(diagnosis_text: str) -> str:
    """STUB: replace with real ontology/terminology mapping.

    Current placeholder: substring keyword match, first hit wins, else
    falls back to "other". Case-insensitive.
    """
    text = diagnosis_text.lower()
    for category, keywords in _KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return category
    return _DEFAULT_CATEGORY
