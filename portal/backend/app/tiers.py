"""Requester tier and simulated-identity policy.

Design decision (locked for this scaffold): there are exactly two requester
tiers, `edu_research` and `business_commercial`, and they have **identical**
privacy behavior — both are limited to `deidentified` data and neither
changes a node's suppression threshold. Tier membership itself is already
enforced by the `RequesterTier` enum on `AccessRequest` (see
`medbridge_schema`); this module is the seam if tier-specific behavior is
ever introduced, and the single place to check "should tiers behave
differently" without hunting through routers.
"""

from __future__ import annotations

from typing import Final

from medbridge_schema import AccessRequest, RequestedDataLevel, RequesterTier

MAX_ORGANIZATION_NAME_LENGTH: Final[int] = 200

ALL_TIERS: tuple[RequesterTier, ...] = (
    RequesterTier.edu_research,
    RequesterTier.business_commercial,
)


class TierPolicyViolation(ValueError):
    """Raised when a request violates the Portal's demo access policy."""


def requires_organization_name(tier: RequesterTier) -> bool:
    """Both tiers require a self-declared organization name (mentor notes)."""
    return True


def max_data_level_for_tier(tier: RequesterTier) -> str:
    """Both tiers are capped at 'deidentified' for this demo. If a
    future tier model needs differentiated access, change this function —
    callers should never hardcode 'deidentified' directly."""
    return "deidentified"


def enforce_access_request_policy(payload: AccessRequest) -> AccessRequest:
    """Validate and normalize the demo's self-declared identity fields.

    This is intentionally not proof of institutional affiliation. It is an
    early Portal-side check; the owning hospital node repeats the policy
    check and remains the final authority.
    """

    if (
        payload.request_id is not None
        or payload.status is not None
        or payload.decision_note is not None
    ):
        raise TierPolicyViolation(
            "request_id, status, and decision_note are assigned by the hospital"
        )

    normalized_organization = " ".join(payload.organization_name.split())
    if requires_organization_name(payload.requester_tier) and not (
        normalized_organization
    ):
        raise TierPolicyViolation("organization_name is required")
    if len(normalized_organization) > MAX_ORGANIZATION_NAME_LENGTH:
        raise TierPolicyViolation(
            f"organization_name must be at most {MAX_ORGANIZATION_NAME_LENGTH} characters"
        )

    if payload.requester_tier not in ALL_TIERS:
        raise TierPolicyViolation("unsupported requester_tier")

    maximum = max_data_level_for_tier(payload.requester_tier)
    if (
        payload.requested_data_level != RequestedDataLevel.deidentified
        or payload.requested_data_level.value != maximum
    ):
        raise TierPolicyViolation(
            f"tier '{payload.requester_tier.value}' is limited to '{maximum}' data"
        )

    return payload.model_copy(
        update={"organization_name": normalized_organization}
    )
