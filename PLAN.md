# MedBridge — Hackathon Plan

**Event:** TOA Health Hack — DICOM Search (Red Hat)
**Team:** 5 · **Demo deadline:** 3:00pm (198 min remaining as of 11:42am)

## Goal

Three pieces that together let a researcher/business search medical imaging
metadata across multiple hospitals, and let hospitals control access to the
underlying de-identified data, without centralizing patient PII:

1. **Open Schema** — defines two data layers (see below), sitting between the
   public portal and each hospital's server. This is the contract everything
   else is built against.
2. **Provider Node / Hospital Server Portal** — an adapter that reads common
   hospital databases (starting from the provided `provider-node` boilerplate
   + synthetic DICOM data), broadcasts schema-compliant search metadata, and
   gives the hospital a mini-UX to view/approve/deny incoming data access
   requests (surfacing requester tier + org name).
3. **Public Portal** — a minimal search UI that queries participating nodes'
   metadata layer, aggregates results, obfuscates rare cohorts, and lets a
   requester (specifying their org + tier) request access to the
   de-identified patient data layer.

Design inspiration: GA4GH Beacon's split of **Framework** (transport/tiers) vs
**Model** (domain schema). We are effectively defining an "Imaging Beacon" model.

### Schema — two data layers
1. **Search/metadata layer** — minimal fields that make a hospital and its
   dataset searchable/identifiable. No sensitive or valuable data lives here.
2. **De-identified patient data layer** — the actual distributable/purchasable
   data, gated behind an access request (org name + tier), and held to a
   stricter de-identification standard (see `MENTOR_NOTES.md`).

### Access model
- Two tiers: **edu/research** vs **business/commercial**.
- Authorization is **fully simulated** — no real login/identity provider —
  but every request must specify an organization name; the hospital reviewer
  sees tier + org name when approving/denying.

## Demo Target (end-to-end lifecycle)

1. Researcher searches "pediatric brain MRI" (natural language or DICOM params).
2. Portal fans out to 2+ simulated hospital nodes; each returns schema-valid
   metadata counts.
3. Rare/small cohorts are obfuscated in the response.
4. Requester specifies org name + tier (edu researcher vs business) → a
   simulated access request is sent to the hospital.
5. Hospital server portal shows the request (org + tier) for approval/denial;
   on approval, the requester gets a secure pathway to the de-identified
   patient data layer.

## Team & Roles

| Member | Background | Primary role |
|--------|-----------|--------------|
| **Justin** | Full stack | Integration & networking — node↔portal contract, multi-node aggregation/broadcast, glue across both components |
| **Agnel** | Data engineer | **Open schema lead** — define the metadata schema + DB-read/broadcast adapter |
| **Kelsey** | Neuro + CS minor, founder | Portal UI/UX + demo/pitch narrative |
| **Jaewon** | Medical + CS | Semantic mapping (tumor↔neoplasm), synthetic-data → schema field mapping |
| **Yizhen** | Medical + CS | Access tiers/researcher personas + rare-cohort obfuscation + search query semantics |

### Workstream split
- **Component A (Schema + Node):** Agnel (lead), Jaewon, Justin (networking)
- **Component B (Portal):** Kelsey (lead), Yizhen, Justin (integration)
- Justin floats across both as the integration owner.

## Timeline (198 min · clock times, ends 3:00pm)

| Time | Duration | Activity |
|------|----------|----------|
| 11:42–12:00 | 18m | **All:** kickoff — lock architecture, MVP scope, clone boilerplate, create branches |
| 12:00–12:25 | 25m | **Justin + Agnel: mentor session on compliant medical data handling** (see below). Meanwhile — Kelsey: portal scaffold; Jaewon: ontology term list; Yizhen: researcher personas + obfuscation rules |
| 12:25–13:15 | 50m | **Sprint 1:** Agnel drafts JSON Schema; Justin builds node broadcast endpoint + portal↔node contract; Jaewon maps synthetic fields→schema; Kelsey builds search UI + results; Yizhen implements tiers + count obfuscation |
| 13:15–13:25 | 10m | **Checkpoint #1:** one node emits schema-valid metadata; portal fetches from it |
| 13:25–14:05 | 40m | **Sprint 2:** multi-node aggregation, semantic search, tiered responses, rare-cohort obfuscation; Kelsey polishes UI + writes demo script |
| 14:05–14:20 | 15m | **Integration freeze + end-to-end test** of the full lifecycle demo |
| 14:20–14:45 | 25m | **Demo prep** — Kelsey leads pitch, rehearse, critical fixes only |
| 14:45–15:00 | 15m | **Buffer** — last-resort fixes only; demo at 3:00pm sharp |

## Mentor Session (Justin + Agnel, 12:00–12:25) — ANSWERED

Held early so answers feed directly into the schema design.
**Full answers in [`MENTOR_NOTES.md`](./MENTOR_NOTES.md).** Summary:
- Compliance baseline: HIPAA (law) + SOC2 (software controls).
- Access tiers: just two — edu/research vs. business/commercial — surfaced
  with org name in the hospital's request-review UX.
- Auth is fully simulated; org name is required on every request.
- Biggest real-world adoption blockers: security and cost.
- Critical constraint: de-identified data (and metadata) must not be
  reverse-engineerable — watch birthdates, rare conditions, and combinations
  of fields (quasi-identifiers), in both schema layers.

## Scope

**MVP (must-have for demo)**
- Open schema (JSON Schema) for both layers — search metadata + de-identified
  patient data — with validation
- ≥2 simulated hospital nodes broadcasting compliant search metadata
- Public portal search → aggregated counts across nodes
- Rare-cohort obfuscation (bucketed ages, thresholded rare-condition counts)
- Simulated access request: requester picks tier (edu/business) + org name
- Hospital server portal: view incoming requests (tier + org), approve/deny
- On approval: pathway to the de-identified patient data layer (can be a
  gated link/stub)

**Stretch (only if ahead)**
- Natural-language query parsing
- Richer semantic/ontology term expansion
- Multi-dimensional aggregations (diagnosis × age × modality)
- Quasi-identifier auditing across compound filters

## Risks & Mitigations
- **Integration lag** → freeze contract at kickoff; Checkpoint #1 forces a
  working node↔portal link by 13:25.
- **Schema scope creep** → keep the model minimal; ontology mapping is stretch.
- **Compliance uncertainty** → resolved up front in the mentor session.
- **Demo fragility** → integration freeze at 14:05; only critical fixes after.
- **Hard deadline** → demo is due 3:00pm sharp, no slack beyond the 14:45–15:00
  buffer. If Sprint 2 overruns, cut stretch scope first, never the freeze/test step.
