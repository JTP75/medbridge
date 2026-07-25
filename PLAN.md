# MedBridge — Hackathon Plan

**Event:** TOA Health Hack — DICOM Search (Red Hat)
**Team:** 5 · **Demo deadline:** 3:00pm (198 min remaining as of 11:42am)

## Goal

Two components that together let a researcher search medical imaging metadata
across multiple hospitals without centralizing patient PII:

1. **Open Schema + Provider Node** — an open metadata schema plus an adapter
   that reads common hospital databases (starting from the provided
   `provider-node` boilerplate + synthetic DICOM data) and broadcasts
   privacy-safe, schema-compliant metadata.
2. **Portal** — a search/access front end that queries participating nodes,
   aggregates results, obfuscates rare cohorts, verifies the researcher, and
   exposes a secure retrieval pathway.

Design inspiration: GA4GH Beacon's split of **Framework** (transport/tiers) vs
**Model** (domain schema). We are effectively defining an "Imaging Beacon" model.

## Demo Target (end-to-end lifecycle)

1. Researcher searches "pediatric brain MRI" (natural language or DICOM params).
2. Portal fans out to 2+ simulated hospital nodes; each returns schema-valid
   metadata counts.
3. Rare/small cohorts are obfuscated in the response.
4. Researcher identity is checked → access tier determined.
5. Portal shows a secure pathway to retrieve permitted metadata from the
   authorized node(s).

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

## Mentor Session (Justin + Agnel, 12:00–12:25)

Held early so answers feed directly into the schema design. Questions to ask:
- Which DICOM/DB metadata fields are safe to broadcast vs. must be stripped
  (HIPAA Safe Harbor / de-identification expectations)?
- How to handle re-identification risk from small counts — threshold values,
  suppression, or differential-privacy noise? What count floor is acceptable?
- What defines the access tiers (anonymous vs. registered vs. IRB-approved)?
- Any constraints on where metadata physically lives / crosses node boundaries?
- What must a "secure retrieval pathway" demonstrate to be credible?

## Scope

**MVP (must-have for demo)**
- Open metadata schema (JSON Schema) + validation
- ≥2 simulated hospital nodes broadcasting compliant metadata
- Portal search → aggregated counts across nodes
- Rare-cohort obfuscation
- Basic researcher identity → tiered response
- Secure-retrieval pathway (can be a gated link/stub)

**Stretch (only if ahead)**
- Natural-language query parsing
- Richer semantic/ontology term expansion
- Multi-dimensional aggregations (diagnosis × age × modality)
- Real auth tokens vs. mocked personas

## Risks & Mitigations
- **Integration lag** → freeze contract at kickoff; Checkpoint #1 forces a
  working node↔portal link by 13:25.
- **Schema scope creep** → keep the model minimal; ontology mapping is stretch.
- **Compliance uncertainty** → resolved up front in the mentor session.
- **Demo fragility** → integration freeze at 14:05; only critical fixes after.
- **Hard deadline** → demo is due 3:00pm sharp, no slack beyond the 14:45–15:00
  buffer. If Sprint 2 overruns, cut stretch scope first, never the freeze/test step.
