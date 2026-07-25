"""Runtime validation helper backed directly by the bundled JSON Schema files.

This is intentionally independent of the generated Pydantic models: even if
a model and its schema ever drift, `validate_payload` always checks against
the literal JSON Schema (the source of truth), using the bundled copy in
`medbridge_schema/schemas/` so it works regardless of where this package was
installed from.
"""

from __future__ import annotations

import functools
import importlib.resources
import json
from typing import Any, Literal

import jsonschema

SchemaName = Literal[
    "imaging_record",
    "query",
    "search_response",
    "access_request",
]

_SCHEMA_FILENAMES: dict[SchemaName, str] = {
    "imaging_record": "imaging_record.schema.json",
    "query": "query.schema.json",
    "search_response": "search_response.schema.json",
    "access_request": "access_request.schema.json",
}


class SchemaValidationError(ValueError):
    """Raised when a payload does not conform to a MedBridge JSON Schema."""

    def __init__(self, schema_name: str, errors: list[str]):
        self.schema_name = schema_name
        self.errors = errors
        super().__init__(
            f"Payload failed validation against '{schema_name}': {errors}"
        )


@functools.lru_cache(maxsize=None)
def _load_schema(schema_name: SchemaName) -> dict[str, Any]:
    filename = _SCHEMA_FILENAMES[schema_name]
    package_schemas = importlib.resources.files("medbridge_schema.schemas")
    with importlib.resources.as_file(package_schemas / filename) as path:
        return json.loads(path.read_text())


def validate_payload(schema_name: SchemaName, data: dict[str, Any]) -> None:
    """Validate `data` against the named schema.

    Raises SchemaValidationError (collecting all violations) if invalid.
    Returns None on success.
    """
    schema = _load_schema(schema_name)
    validator = jsonschema.Draft7Validator(schema)
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    if errors:
        raise SchemaValidationError(
            schema_name, [e.message for e in errors]
        )
