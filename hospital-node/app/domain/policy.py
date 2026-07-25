"""STUB — owner: Yizhen (access & privacy policy).

Applies small-cohort suppression to a raw match count before it is allowed
to leave the node in a SearchResponse. Do not let a raw count reach a
response payload without going through `apply_suppression`.

Current implementation is a working default matching the demo policy table
in architecture.md ("Privacy behavior"): exact count at/above threshold,
"<threshold" and suppressed=True below it, "No matches" at zero. Replace
with the real age-bucketing / rare-cohort / quasi-identifier policy without
changing the call site in routers/beacon.py — the return shape (matching
SearchResponse's `match` field) is the contract.
"""

from __future__ import annotations

from typing import Optional, TypedDict


class MatchResult(TypedDict):
    exists: bool
    count: Optional[int]
    display_count: Optional[str]
    suppressed: bool
    suppression_reason: Optional[str]


def apply_suppression(raw_count: int, threshold: int) -> MatchResult:
    """STUB: replace with the real suppression / quasi-identifier policy.

    `raw_count` must never itself be serialized when suppressed=True.
    """
    if raw_count <= 0:
        return {
            "exists": False,
            "count": 0,
            "display_count": "0",
            "suppressed": False,
            "suppression_reason": None,
        }
    if raw_count < threshold:
        return {
            "exists": True,
            "count": None,
            "display_count": f"<{threshold}",
            "suppressed": True,
            "suppression_reason": "small_cohort",
        }
    return {
        "exists": True,
        "count": raw_count,
        "display_count": str(raw_count),
        "suppressed": False,
        "suppression_reason": None,
    }
