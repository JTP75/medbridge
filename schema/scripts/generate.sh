#!/usr/bin/env bash
# Regenerate Python (Pydantic) and TypeScript types from the JSON Schema
# source of truth in schema/schemas/. Run this after editing any
# schema/schemas/*.schema.json file.
#
# Usage: schema/scripts/generate.sh
#
# Outputs (both committed to git so downstream services don't need this
# toolchain to build):
#   schema/gen/python/medbridge_schema/models/   (Pydantic v2 models)
#   schema/gen/python/medbridge_schema/schemas/  (bundled copy of the JSON
#                                                  Schema files, for runtime
#                                                  jsonschema validation)
#   schema/gen/typescript/index.ts               (TS interfaces)
set -euo pipefail

SCHEMA_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCHEMA_ROOT"

SCHEMAS_DIR="schemas"
PY_PKG_DIR="gen/python/medbridge_schema"
PY_MODELS_DIR="$PY_PKG_DIR/models"
PY_SCHEMAS_BUNDLE_DIR="$PY_PKG_DIR/schemas"
TS_OUT="gen/typescript/index.ts"
CODEGEN_VENV=".venv-codegen"

echo "==> Regenerating from $SCHEMAS_DIR"

# --- Python: Pydantic models via datamodel-code-generator -----------------
if [ ! -d "$CODEGEN_VENV" ]; then
  echo "==> Creating local codegen venv ($CODEGEN_VENV)"
  python3 -m venv "$CODEGEN_VENV"
  "$CODEGEN_VENV/bin/pip" install --quiet --upgrade pip
  "$CODEGEN_VENV/bin/pip" install --quiet datamodel-code-generator
fi

rm -rf "$PY_MODELS_DIR"
"$CODEGEN_VENV/bin/datamodel-codegen" \
  --input "$SCHEMAS_DIR" \
  --input-file-type jsonschema \
  --output "$PY_MODELS_DIR" \
  --output-model-type pydantic_v2.BaseModel \
  --target-python-version 3.11 \
  --use-schema-description \
  --disable-timestamp \
  --formatters black --formatters isort

# Bundle a copy of the raw JSON Schema into the package itself so
# jsonschema-based validate_payload() works regardless of where the
# package is installed from (path dep, wheel, container layer, ...).
rm -rf "$PY_SCHEMAS_BUNDLE_DIR"
mkdir -p "$PY_SCHEMAS_BUNDLE_DIR"
cp "$SCHEMAS_DIR"/*.schema.json "$PY_SCHEMAS_BUNDLE_DIR/"

echo "==> Wrote $PY_MODELS_DIR and $PY_SCHEMAS_BUNDLE_DIR"

# --- TypeScript: interfaces via json-schema-to-typescript ------------------
mkdir -p "$(dirname "$TS_OUT")"
{
  echo "/**"
  echo " * GENERATED FILE - do not edit by hand."
  echo " * Source of truth: schema/schemas/*.schema.json"
  echo " * Regenerate with: schema/scripts/generate.sh"
  echo " */"
  echo
} > "$TS_OUT"

for f in "$SCHEMAS_DIR"/*.schema.json; do
  name="$(basename "$f" .schema.json)"
  echo "// ---- ${name} ----" >> "$TS_OUT"
  npx --yes json-schema-to-typescript "$f" --cwd "$SCHEMAS_DIR" --bannerComment "" >> "$TS_OUT"
  echo >> "$TS_OUT"
done

echo "==> Wrote $TS_OUT"
echo "==> Done."
