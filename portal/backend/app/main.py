"""Portal backend FastAPI app factory.

Run locally:
    PORTAL_NODES_CONFIG=config/nodes.local.json uvicorn app.main:app --port 8000

Owns aggregation (fan-out to all hospital nodes, combine safe responses)
and access-request routing/proxying to the owning node. See
portal/AGENTS.md for the split with portal/frontend.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import access, search


def create_app() -> FastAPI:
    app = FastAPI(
        title="MedBridge Portal Backend",
        version="0.1.0",
        description=(
            "Aggregation (/api/portal/search) and access-request routing "
            "(/api/portal/access-requests, /api/portal/nodes/*) across "
            "hospital nodes. See portal/AGENTS.md."
        ),
    )

    # STUB: wide open for local/demo use. Tighten allow_origins before any
    # real deployment.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(search.router)
    app.include_router(access.router)

    @app.get("/healthz")
    def healthz() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
