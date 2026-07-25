# schema/

The single source of truth for the MedBridge data contracts. Both
`hospital-node/` and `portal/` (backend + frontend) generate their runtime
types from the JSON Schema files here — edit the schema once, regenerate,
and both apps' types update together.

**Owner:** Agnel (schema lead), with Jaewon on semantic/ontology concepts,
Yizhen on access/privacy-policy fields, and Justin on the request/response
contract boundary. See root [`AGENTS.md`](../AGENTS.md) for the full
ownership map.

**Current status:** all four schemas have real field lists/enums/vocab
(finalized by Agnel against the synthetic `data/*.json` hospital records and
MENTOR_NOTES.md's de-identification constraints — see each schema's
`description` fields). `query`/`imaging_record` share one enum vocabulary
for `modality`/`body_part`/`age_band`/`sex`/`condition_category`; add new
values to both together if you extend it. The wiring (this README,
`generate.sh`, the package structure) doesn't need to change if you do.

## Layout

```
schema/
  schemas/                        # <-- EDIT HERE. JSON Schema source of truth.
    imaging_record.schema.json        the safe 7-field record shape
    query.schema.json                 discovery query (Portal -> node)
    search_response.schema.json       discovery response (node -> Portal)
    access_request.schema.json        access-request contract
  gen/                            # generated, do not hand-edit
    python/medbridge_schema/
      __init__.py                    hand-written: re-exports + package docstring
      validate.py                    hand-written: jsonschema-backed validate_payload()
      models/                        generated: Pydantic v2 models
      schemas/                       generated: bundled copy of schemas/*.json
    typescript/index.ts             generated: TS interfaces
  scripts/generate.sh             regenerates everything under gen/
  pyproject.toml                  makes gen/python a pip-installable package
```

## Editing a schema

1. Edit the relevant file in `schemas/*.schema.json`.
2. Run `./scripts/generate.sh` (first run creates a local `.venv-codegen/`
   for the Python codegen tool; needs network access once to install
   `datamodel-code-generator` and to `npx` `json-schema-to-typescript`).
3. Commit the changed `schemas/*.json` **and** the regenerated `gen/`
   output together — `gen/` is committed so `hospital-node` and `portal`
   can build without needing this toolchain installed.

## Consuming from Python (hospital-node, portal/backend)

Add as a local path dependency, e.g. in that service's `pyproject.toml` /
`requirements.txt`:

```
-e ../schema
```

Then:

```python
from medbridge_schema import DiscoveryQuery, SearchResponse, AccessRequest, ImagingRecord
from medbridge_schema import validate_payload, SchemaValidationError

validate_payload("search_response", response_dict)  # raises SchemaValidationError if invalid
```

`validate_payload` checks the literal JSON Schema (via the bundled copy in
`medbridge_schema/schemas/`), independent of the generated Pydantic models —
use it as a final strictness check on anything crossing an HTTP boundary.

## Consuming from TypeScript (portal/frontend)

Import the generated interfaces directly:

```ts
import type { SearchResponse, AccessRequest } from "@medbridge/schema";
```

(`portal/frontend` maps that import to `../../schema/gen/typescript/index.ts` —
see `portal/frontend/AGENTS.md` for the exact wiring.)

## Why `additionalProperties: false` everywhere

Every schema in `schemas/` sets `additionalProperties: false`. This is the
core privacy guarantee from the mentor session and architecture.md: if a
field isn't explicitly listed as safe, it is rejected rather than silently
passed through. Keep this invariant when adding fields.
