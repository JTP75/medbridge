"""Shared MedBridge schema package.

This is the Python-side connection point between the JSON Schema source of
truth (``schema/schemas/*.schema.json``) and the two services that consume
it (``hospital-node`` and ``portal/backend``).

Hand-written files in this package:
    __init__.py   (this file)
    validate.py

Generated files (do NOT hand-edit; re-run ``schema/scripts/generate.sh``):
    models/    - Pydantic v2 models, one module per schema file
    schemas/   - bundled copy of the raw JSON Schema files, used by
                 validate.py for strict jsonschema-based validation

Both apps should install this package as a local path dependency, e.g.

    pip install -e ../../schema     # from hospital-node/ or portal/backend/

and then:

    from medbridge_schema import DiscoveryQuery, SearchResponse, validate_payload
"""

from .models.access_request_schema import AccessRequest, RequestedDataLevel, RequesterTier
from .models.access_request_schema import Status as AccessRequestStatus
from .models.imaging_record_schema import ImagingRecord
from .models.query_schema import DiscoveryQuery
from .models.search_response_schema import SearchResponse
from .validate import SchemaValidationError, validate_payload

__all__ = [
    "ImagingRecord",
    "DiscoveryQuery",
    "SearchResponse",
    "AccessRequest",
    "AccessRequestStatus",
    "RequesterTier",
    "RequestedDataLevel",
    "validate_payload",
    "SchemaValidationError",
]
