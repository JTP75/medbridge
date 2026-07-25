# MedBridge — Repo Navigation & Ownership

TOA Health Hack (Red Hat) — federated discovery + access-request prototype
for medical imaging metadata across hospital nodes. Read this file first;
it links out to everything else.

## Three directories

| Directory | What it is | Primary owner(s) |
|---|---|---|
| [`schema/`](./schema/README.md) | Source of truth: JSON Schema for all data contracts (imaging record, discovery query, search response, access request), generated into Pydantic (Python) + TypeScript types consumed by both apps | **Agnel** (schema lead), Jaewon (semantic/ontology fields) |
| [`hospital-node/`](./hospital-node/) | FastAPI boilerplate for a hospital's provider node — discovery (`/api/beacon/*`) + access-request (`/api/access/*`) endpoints. Runs as 3 instances (BCH/MGH/BWH). Domain seams (`adapter.py`, `ontology.py`, `policy.py`) are stubs to be filled in | **Agnel + Jaewon** (adapter/ontology), **Yizhen** (privacy/suppression policy), Justin (contract boundary) |
| [`portal/`](./portal/) — `backend/` + `frontend/` | `backend/`: FastAPI aggregation (fan-out to all nodes, combine safe results) + access-request routing/proxying. `frontend/`: Next.js public search UI + hospital reviewer UI | **Justin** (backend/aggregation), **Kelsey** (frontend UI/UX), Yizhen (tier rules) |

Everything is boilerplate/scaffolding as of this commit — see each
directory's own docs for what's a working default vs. an explicitly-marked
stub seam meant to be replaced.

## How the three connect

```
schema/  --(generate.sh)-->  Pydantic models  --consumed by-->  hospital-node/, portal/backend/
schema/  --(generate.sh)-->  TS interfaces    --consumed by-->  portal/frontend/ (import "@medbridge/schema")

hospital-node/ (x3, ports 8001-8003)  <--HTTP--  portal/backend/ (port 8000, aggregation)  <--HTTP--  portal/frontend/ (port 3000)
```

Edit a schema in `schema/schemas/*.schema.json`, run `schema/scripts/generate.sh`,
and both the Python and TypeScript sides pick up the change.

## Running everything

```
docker compose up --build
```

Brings up `node-bch` (:8001), `node-mgh` (:8002), `node-bwh` (:8003),
`portal-api` (:8000), `portal-web` (:3000). See `docker-compose.yml`.

For local (non-Docker) dev, each service has its own `requirements.txt` /
`package.json` and can be run directly — see the README/comments in that
directory.

## Where to find other docs

- [`PLAN.md`](./PLAN.md) — original hackathon plan: goal, timeline, team roles, scope, risks.
- [`MENTOR_NOTES.md`](./MENTOR_NOTES.md) — compliance baseline (HIPAA/SOC2), access-tier model, de-identification constraints from the mentor session.
- [`architecture.md`](./architecture.md) — the authoritative system architecture: component responsibilities, API contract, privacy behavior, requester/tier model, access-request lifecycle. **Treat this as the source of truth for how the system is supposed to work**; this scaffold implements its shape, not (yet) its full domain logic.
- [`SCAFFOLD_PLAN.md`](./SCAFFOLD_PLAN.md) — the implementation plan for this boilerplate (this commit): design decisions, build slices, acceptance criteria.
- [`LT1_NOTES.md`](./LT1_NOTES.md) — lightning-talk notes from a teammate; useful context but treat as informal/secondary to `architecture.md` where they conflict.
- [`Demo.md`](./Demo.md) — link to the demo presentation.
- [`schema/README.md`](./schema/README.md) — how to edit/regenerate schemas and consume them from either app.

## Team

| Member | Background | Primary role |
|---|---|---|
| Justin | Full stack | Integration & networking — portal backend/aggregation, node↔portal contract |
| Agnel | Data engineer | Schema + hospital-node adapter lead |
| Kelsey | Neuro + CS minor, founder | Portal frontend UI/UX + demo narrative |
| Jaewon | Medical + CS | Semantic/ontology mapping |
| Yizhen | Medical + CS | Access tiers + privacy/suppression policy |
