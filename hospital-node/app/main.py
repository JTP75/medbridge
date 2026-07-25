"""Hospital node FastAPI app factory.

Run locally:
    HOSPITAL_NODE_CONFIG=config/node.bch.json uvicorn app.main:app --port 8001

Boots with `domain.demo_data`'s deterministic synthetic records so the two
router groups (`/api/beacon/*`, `/api/access/*`) work out of the box. See
each router module and `app/domain/*.py` for what's boilerplate vs. what's
a stub seam meant to be replaced.
"""

from __future__ import annotations

from fastapi import FastAPI

from .config import get_node_config
from .domain import store
from .routers import access, beacon


def create_app() -> FastAPI:
    config = get_node_config()
    store.load_records(config.node_id)

    app = FastAPI(
        title=f"MedBridge Hospital Node ({config.node_id})",
        version="0.1.0",
        description=(
            "Boilerplate provider-node — see hospital-node/AGENTS.md. "
            "Discovery: /api/beacon/*. Access requests: /api/access/*."
        ),
    )
    app.include_router(beacon.router)
    app.include_router(access.router)

    @app.get("/healthz")
    def healthz() -> dict:
        return {"status": "ok", "node_id": config.node_id}

    return app


app = create_app()
