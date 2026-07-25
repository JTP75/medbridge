import os

import pytest

os.environ.setdefault(
    "PORTAL_NODES_CONFIG",
    os.path.join(os.path.dirname(__file__), "..", "config", "nodes.local.json"),
)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402


@pytest.fixture()
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def valid_request() -> dict:
    return {
        "requester_name": "Dr. Jane Researcher",
        "organization_name": "Example University",
        "requester_tier": "edu_research",
        "contact_email": "jane@example.edu",
        "research_purpose": "Studying pediatric brain MRI cohorts.",
        "query_summary": "modality=MR, body_part=BRAIN, condition_category=neoplasm",
        "requested_node_id": "BCH",
        "requested_data_level": "deidentified",
    }
