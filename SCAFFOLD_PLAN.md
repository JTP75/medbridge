# MedBridge Boilerplate Scaffold — Implementation Plan

**Status:** Approved, pre-implementation
**Date:** 2026-07-25

## Description

Stand up generic, drop-in boilerplate for the three MedBridge pieces so the
team can implement in parallel against a fixed contract. Nothing here
implements domain logic (Agnel's adapter/schema, Jaewon's ontology, Yizhen's
policy, Kelsey's UI) — it provides the **structure, the shared schema
wiring, and the run/orchestration glue** so those slots are ready to fill.

Treat `architecture.md` as the source of truth for the contract (it is
architected, **not** implemented — `LT1_NOTES.md`'s description of a
"working" node predates/overstates what's actually in this repo).

## Design decisions

| Decision | Choice |
|---|---|
| Directories | `hospital-node/`, `portal/`, `schema/` (3 total) |
| API contract | Unified `/api` prefix — `/api/beacon/*` (discovery) + `/api/access/*` (requests), one role/tier middleware |
| Schema source of truth | JSON Schema in `schema/`; generate Pydantic (Python) + TS types for consumers. Agnel authors the actual schemas |
| Deployment | docker-compose, one machine |
| Portal | FastAPI backend (aggregation lives here) + Next.js frontend |
| Aggregation | Module inside portal backend (not a 4th service) |
| Tiers | 2: `edu_research` / `business_commercial`, identical privacy behavior for both |

## The crux: how the schema connects to both apps

`schema/` is the **single source of truth**. A generation step fans the JSON
Schema out to each runtime's native types, so both apps validate against the
exact same contract:

```
schema/
  schemas/                     # JSON Schema files (Agnel authors these)
    imaging_record.schema.json     # 7-field safe record (placeholder stub)
    query.schema.json              # discovery query contract (stub)
    search_response.schema.json    # node count/suppression response (stub)
    access_request.schema.json     # access-request contract (stub)
  gen/
    python/medbridge_schema/   # generated Pydantic models + validate() helper
    typescript/index.ts        # generated TS types
  scripts/generate.sh          # datamodel-codegen (py) + json-schema-to-typescript (ts)
  pyproject.toml               # installable `medbridge_schema` package (path dep)
  README.md
```

- **hospital-node** and **portal backend** install `medbridge_schema` as a
  path dependency (Pydantic models + `validate()`).
- **portal frontend (Next.js)** imports the generated
  `schema/gen/typescript/index.ts`.
- `schema/scripts/generate.sh` regenerates both from the JSON Schema — run
  locally and at Docker build. This is the "connect schema to both apps"
  requirement, kept generic: change JSON Schema once, both runtimes pick it
  up.

We ship **stub schemas** (minimal valid placeholders) so generation works
end-to-end today; Agnel fills in real fields without touching the wiring.

## Component specs

### `hospital-node/` (boilerplate; owners: Agnel + Jaewon, policy hook Yizhen, contract Justin)
- FastAPI app, runs as 3 instances (BCH/MGH/BWH) from the same image + per-node config.
- Unified router:
  - `GET /api/beacon/info`, `POST /api/beacon/query` — discovery (returns counts only; **no record endpoint**)
  - `GET /api/access/config`, `POST /api/access/requests`, `GET /api/access/requests`, `GET/POST .../{id}`, `POST .../{id}/decision`, `POST .../{id}/additional-information`
- Clearly-marked stub seams: `adapter.py` (raw→schema), `ontology.py` (term
  mapping), `policy.py` (age bucketing + small-cohort suppression, threshold
  from config), in-memory request store.
- `node.config.json` per node (node_id, threshold, max_data_level, synthetic access contact).
- Validates all outbound payloads against `medbridge_schema`.

### `portal/` (owners: Kelsey frontend, Justin backend/aggregation, Yizhen tier rules)
- `portal/backend/` — FastAPI: aggregation module (fan-out to node URLs from
  config, sum safe counts, never reconstruct suppressed counts),
  access-request routing to the owning node, tier/role handling (2 tiers),
  reviewer proxy endpoints.
- `portal/frontend/` — Next.js: public requester view (search, aggregate
  results, tier selector, org-name field, request form, status) + hospital
  reviewer view (per-node queue, approve/deny/more-info). Consumes generated
  TS types; talks only to portal backend.

### `schema/` — as above (owner: Agnel; semantic concepts Jaewon).

## Orchestration

`docker-compose.yml` at repo root:
- `node-bch` :8001, `node-mgh` :8002, `node-bwh` :8003 (same image, different config/env)
- `portal-api` :8000 (env: node URLs)
- `portal-web` :3000 (env: portal-api URL)
- Build contexts reach `schema/` so generation runs at build. A root
  `Makefile`/`scripts/dev.sh` for `generate` + `up`.

## Deliverables

- `AGENTS.md` at repo root: navigation between the 3 dirs, per-dir ownership
  (mapped from architecture.md's component table), and pointers to
  `architecture.md`, `PLAN.md`, `MENTOR_NOTES.md`, `Demo.md`,
  `LT1_NOTES.md`, and each dir's README.
- Per-directory `AGENTS.md`/`README.md` stubs.
- `CLAUDE.md` = `@AGENTS.md`.
- This plan file (`SCAFFOLD_PLAN.md`), git-tracked, pushed before coding begins.

## Build slices (mergeable order)

1. **Schema foundation** — dir, stub JSON Schemas, `generate.sh`,
   `medbridge_schema` package, generated TS.
   *Verify: `generate.sh` produces Pydantic + TS with no errors.*
2. **hospital-node boilerplate** — FastAPI app, unified router w/ stub
   handlers, config, schema validation.
   *Verify: one node boots, `/api/beacon/info` + `/api/access/config` respond.*
3. **portal backend** — FastAPI, aggregation fan-out, access routing, tier
   middleware.
   *Verify: boots, aggregates against ≥1 node.*
4. **portal frontend** — Next.js scaffold, two views wired to backend,
   generated TS types.
   *Verify: `next build` succeeds, pages render.*
5. **docker-compose + scripts** — 3 nodes + portal-api + portal-web.
   *Verify: `docker compose up` brings all services healthy; portal reaches
   all 3 nodes.*
6. **AGENTS.md / per-dir READMEs / CLAUDE.md**, then commit + push.

## Risks & rollback

- **Schema generation toolchain** (datamodel-codegen / json-schema-to-typescript)
  is the highest-risk generic piece → build/verify it first (slice 1) so
  downstream slots are stable.
- **Docker build context vs schema sharing** → single root compose with
  schema reachable by all builds; fallback is committing `schema/gen/`
  outputs so builds don't require the generator.
- **Scope drift into domain logic** → every domain seam is an
  explicitly-marked stub; do not implement adapter/ontology/policy/UI logic.
- **Rollback**: all additive in new directories; revert the scaffold commit
  to return to the docs-only repo.

## Acceptance criteria

- `docker compose up` starts 3 nodes + portal-api + portal-web on one machine.
- A JSON Schema edit, after `generate.sh`, changes both Pydantic and TS types.
- Portal backend fans out to all 3 nodes and returns an aggregated response
  (stubbed counts fine).
- Both node API groups (`/api/beacon/*`, `/api/access/*`) respond per
  contract.
- `AGENTS.md` (navigation + ownership + doc pointers) and `CLAUDE.md`
  (`@AGENTS.md`) exist.
- No domain logic implemented — only marked stubs.
