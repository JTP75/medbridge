"""Client and adapter helpers for the provider-node HTTP API."""

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from .schema_mapper import map_study_to_schema


class ProviderNodeError(RuntimeError):
    """Raised when a provider node cannot return a valid study collection."""


def fetch_studies(base_url: str, timeout: float = 5.0) -> list[dict[str, Any]]:
    """Fetch raw records from a provider-node ``/api/studies`` endpoint."""
    url = f"{base_url.rstrip('/')}/api/studies"

    try:
        with urlopen(url, timeout=timeout) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ProviderNodeError(f"Could not fetch studies from {url}") from exc

    if not isinstance(payload, list) or not all(
        isinstance(record, dict) for record in payload
    ):
        raise ProviderNodeError(
            f"Provider node returned an invalid study collection from {url}"
        )

    return payload


def map_studies(raw_studies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Map a provider-node study list to privacy-safe schema records."""
    return [map_study_to_schema(study) for study in raw_studies]


def fetch_mapped_studies(
    base_url: str, timeout: float = 5.0
) -> list[dict[str, Any]]:
    """Fetch and map every study exposed by one provider node."""
    return map_studies(fetch_studies(base_url, timeout=timeout))
