import os

import pytest

os.environ.setdefault(
    "HOSPITAL_NODE_CONFIG",
    os.path.join(os.path.dirname(__file__), "..", "config", "node.bch.json"),
)

from fastapi.testclient import TestClient  # noqa: E402

from app.domain import store  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture()
def client():
    app = create_app()
    store.reset_for_tests()
    with TestClient(app) as c:
        yield c
