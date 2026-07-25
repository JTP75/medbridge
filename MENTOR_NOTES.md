# Mentor Session Notes — Compliant Medical Data Handling

Answers from Justin & Agnel's mentor session. These feed directly into the
schema, access-tier, and portal UX design.

## Compliance baseline
- **HIPAA** (US law) and **SOC2** (software/org controls) are the two
  frameworks to reason from. We don't need full audit-grade compliance for a
  hackathon demo, but design choices should be defensible against both.

## Access tiers
- Two tiers, not a spectrum: **edu/research** vs **business/commercial**.
- The hospital-side mini-UX (data access request view) must clearly surface,
  per incoming request:
  - which tier the requester falls under (edu researcher vs business consumer)
  - the name of the requesting organization
- Authorization is **fully simulated** for the hackathon — no real login or
  identity provider — but every request must specify an organization name;
  that name + tier is what the hospital reviewer sees when approving/denying.

## Barriers to hospital adoption (real-world gotchas)
- **Security** and **incurred cost** are the two things that would actually
  block a hospital from adopting something like this in practice. Worth
  acknowledging in the pitch/demo narrative even though we won't solve them
  in 3 hours.

## De-identification — the critical risk
- Core failure mode to design against: patient identity must not be exposed,
  and it **must not be reverse-engineerable** from the data we expose.
- Applies to *both* schema layers (search metadata and de-identified patient
  data) — not just the sensitive layer.
- Specific reverse-engineering vectors to watch for:
  - exact birthdates / ages
  - rare conditions (small-cohort exposure)
  - **combinations** of otherwise-innocuous fields (quasi-identifiers) that
    narrow a cohort down to one identifiable person
- Implication for schema/obfuscation work: bucket ages instead of exact
  birthdates, suppress/threshold rare-condition counts, and audit any
  query/response path for compound filters that could re-identify someone.

## Data model implication (from updated feature info)
Confirms the two-part schema split reflected in `PLAN.md`:
1. **Search/metadata layer** — minimal fields that make a hospital and its
   dataset searchable/identifiable. No sensitive or valuable data lives here.
2. **De-identified patient data layer** — the actual distributable/purchasable
   data, gated behind an access-tier + org-name request, subject to the
   de-identification rules above.

## System shape this implies
- A minimal **public portal UI** for searching (queries the metadata layer).
- A **hospital server portal** for viewing and approving/denying incoming
  data access requests (sees requester tier + org name).
- An **open schema** sitting between them, defining both the metadata layer
  and the de-identified patient data layer.
