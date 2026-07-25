"""Node directory for the portal backend — which hospital nodes exist and
where to reach them.

Owner: Justin (aggregation/routing). Selected via the PORTAL_NODES_CONFIG
env var so the same code works for local multi-terminal dev (nodes on
localhost:8001-8003) and docker-compose (nodes on their service hostnames) —
see config/nodes.local.json vs config/nodes.docker.json.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

_DEFAULT_NODES_CONFIG = os.path.join(
    os.path.dirname(__file__), "..", "config", "nodes.local.json"
)


@dataclass(frozen=True)
class NodeEndpoint:
    node_id: str
    base_url: str


@lru_cache
def get_nodes() -> list[NodeEndpoint]:
    path = os.environ.get("PORTAL_NODES_CONFIG", _DEFAULT_NODES_CONFIG)
    with open(path) as f:
        data = json.load(f)
    return [
        NodeEndpoint(node_id=n["node_id"], base_url=n["base_url"].rstrip("/"))
        for n in data["nodes"]
    ]


def get_node(node_id: str) -> Optional[NodeEndpoint]:
    return next((n for n in get_nodes() if n.node_id == node_id), None)
