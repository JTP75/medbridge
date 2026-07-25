"""STUB — owner: Yizhen (requester tier / access policy).

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

from medbridge_schema import RequesterTier

ALL_TIERS: tuple[RequesterTier, ...] = (
    RequesterTier.edu_research,
    RequesterTier.business_commercial,
)


def requires_organization_name(tier: RequesterTier) -> bool:
    """Both tiers require a self-declared organization name (mentor notes)."""
    return True


def max_data_level_for_tier(tier: RequesterTier) -> str:
    """STUB: both tiers are capped at 'deidentified' for this demo. If a
    future tier model needs differentiated access, change this function —
    callers should never hardcode 'deidentified' directly."""
    return "deidentified"
