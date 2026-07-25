"""MedBridge provider-node access and privacy policy.

Applies small-cohort suppression to a raw match count before it is allowed
to leave the node in a SearchResponse. Do not let a raw count reach a
response payload without going through `apply_suppression`.

This module also owns broad DICOM-age bucketing, the two-tier request policy,
and access-request state-transition rules. Both requester tiers have identical
privacy behavior and are capped at de-identified data.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Final, Optional, TypedDict

from medbridge_schema import (
    AccessRequest,
    AccessRequestStatus,
    RequestedDataLevel,
    RequesterTier,
)


MAX_ORGANIZATION_NAME_LENGTH: Final[int] = 200
_DICOM_AGE_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"^(?P<value>\d{3})(?P<unit>[DWMY])$"
)


class MatchResult(TypedDict):
    exists: bool
    count: Optional[int]
    display_count: Optional[str]
    suppressed: bool
    suppression_reason: Optional[str]


class PolicyViolation(ValueError):
    """Raised when a request violates a MedBridge demo policy."""


@dataclass(frozen=True)
class AgeBand:
    """Half-open age band: lower_years <= age < upper_years."""

    label: str
    lower_years: float
    upper_years: float | None

    def contains(self, age_years: float) -> bool:
        if age_years < self.lower_years:
            return False
        return self.upper_years is None or age_years < self.upper_years


DEFAULT_AGE_BANDS: Final[tuple[AgeBand, ...]] = (
    AgeBand("0-1", 0, 2),
    AgeBand("2-5", 2, 6),
    AgeBand("6-12", 6, 13),
    AgeBand("13-17", 13, 18),
    AgeBand("18-64", 18, 65),
    AgeBand("65+", 65, None),
)

_ALLOWED_STATUS_TRANSITIONS: Final[
    dict[AccessRequestStatus, frozenset[AccessRequestStatus]]
] = {
    AccessRequestStatus.pending_hospital_review: frozenset(
        {
            AccessRequestStatus.more_information_requested,
            AccessRequestStatus.approved,
            AccessRequestStatus.rejected,
        }
    ),
    # The demo has no separate "requester responded" endpoint. A reviewer may
    # approve or reject after receiving the requested information manually.
    AccessRequestStatus.more_information_requested: frozenset(
        {
            AccessRequestStatus.approved,
            AccessRequestStatus.rejected,
        }
    ),
    AccessRequestStatus.approved: frozenset(
        {
            AccessRequestStatus.revoked,
            AccessRequestStatus.expired,
        }
    ),
    AccessRequestStatus.rejected: frozenset(),
    AccessRequestStatus.revoked: frozenset(),
    AccessRequestStatus.expired: frozenset(),
}


def apply_suppression(raw_count: int, threshold: int) -> MatchResult:
    """Apply the provider node's configurable small-cohort policy.

    `raw_count` must never itself be serialized when suppressed=True.
    """
    _require_plain_int(raw_count, field_name="raw_count")
    _require_plain_int(threshold, field_name="threshold")
    if raw_count < 0:
        raise ValueError("raw_count must be zero or greater")
    if threshold < 1:
        raise ValueError("threshold must be at least 1")

    if raw_count == 0:
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


def dicom_age_to_years(dicom_age: str) -> float:
    """Convert a DICOM AS value to years solely for age-band selection."""

    if not isinstance(dicom_age, str):
        raise TypeError("dicom_age must be a string")
    match = _DICOM_AGE_PATTERN.fullmatch(dicom_age.strip().upper())
    if match is None:
        raise ValueError("dicom_age must use DICOM AS format NNN[D|W|M|Y]")

    value = int(match.group("value"))
    unit = match.group("unit")
    divisors = {"D": 365.25, "W": 52.1775, "M": 12.0, "Y": 1.0}
    return value / divisors[unit]


def bucket_age_years(
    age_years: float,
    bands: tuple[AgeBand, ...] = DEFAULT_AGE_BANDS,
) -> str:
    """Return a broad age band without returning the exact age."""

    if isinstance(age_years, bool) or not isinstance(age_years, (int, float)):
        raise TypeError("age_years must be a number")
    if age_years < 0:
        raise ValueError("age_years must be zero or greater")
    if not bands:
        raise ValueError("at least one age band is required")

    for band in bands:
        if band.contains(float(age_years)):
            return band.label
    raise ValueError("age does not fall within the configured bands")


def bucket_dicom_age(
    dicom_age: str,
    bands: tuple[AgeBand, ...] = DEFAULT_AGE_BANDS,
) -> str:
    """Convert a DICOM AS value directly to a privacy-safe age band."""

    return bucket_age_years(dicom_age_to_years(dicom_age), bands=bands)


def enforce_access_request_policy(
    payload: AccessRequest,
    maximum_data_level: str,
) -> AccessRequest:
    """Validate and normalize the simulated requester identity fields."""

    if (
        payload.request_id is not None
        or payload.status is not None
        or payload.decision_note is not None
    ):
        raise PolicyViolation(
            "request_id, status, and decision_note are assigned by the hospital"
        )

    normalized_organization = " ".join(payload.organization_name.split())
    if not normalized_organization:
        raise PolicyViolation("organization_name is required")
    if len(normalized_organization) > MAX_ORGANIZATION_NAME_LENGTH:
        raise PolicyViolation(
            f"organization_name must be at most {MAX_ORGANIZATION_NAME_LENGTH} characters"
        )

    # Explicitly enumerate both approved tiers. The generated schema already
    # rejects other strings, and this check documents the policy boundary.
    if payload.requester_tier not in {
        RequesterTier.edu_research,
        RequesterTier.business_commercial,
    }:
        raise PolicyViolation("unsupported requester_tier")

    if maximum_data_level != RequestedDataLevel.deidentified.value:
        raise PolicyViolation("node maximum_data_level must be deidentified")
    if payload.requested_data_level != RequestedDataLevel.deidentified:
        raise PolicyViolation("only deidentified access is supported")

    return payload.model_copy(
        update={"organization_name": normalized_organization}
    )


def enforce_status_transition(
    current: AccessRequestStatus | None,
    target: AccessRequestStatus,
) -> None:
    """Reject access-request state changes not allowed by the demo workflow."""

    if current is None:
        raise PolicyViolation("access request has no current status")
    allowed = _ALLOWED_STATUS_TRANSITIONS[current]
    if target not in allowed:
        raise PolicyViolation(
            f"cannot transition access request from '{current.value}' to '{target.value}'"
        )


def _require_plain_int(value: object, field_name: str) -> None:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f"{field_name} must be an integer")
