"""Per-node operational configuration.

This is deliberately separate from the `medbridge_schema` wire contracts:
it's local config for *this* node process (which port, which synthetic
dataset profile, its suppression threshold, its synthetic contact info),
not something exchanged over HTTP with the Portal.

Config is loaded once (cached) from a JSON file, selected via the
HOSPITAL_NODE_CONFIG env var, matching architecture.md's "Node
Configuration" example.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache

from pydantic import BaseModel

_DEFAULT_CONFIG_PATH = os.path.join(
    os.path.dirname(__file__), "..", "config", "node.default.json"
)


class AccessContact(BaseModel):
    department: str
    email: str
    phone: str


class NodeConfig(BaseModel):
    node_id: str
    small_cohort_threshold: int = 10
    maximum_data_level: str = "deidentified"
    access_contact: AccessContact


@lru_cache
def get_node_config() -> NodeConfig:
    path = os.environ.get("HOSPITAL_NODE_CONFIG", _DEFAULT_CONFIG_PATH)
    with open(path) as f:
        data = json.load(f)
    return NodeConfig(**data)
