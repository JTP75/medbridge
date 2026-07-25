import respx
from httpx import Response


@respx.mock
def test_create_access_request_routes_to_owning_node(client, valid_request):
    respx.post("http://localhost:8001/api/access/requests").mock(
        return_value=Response(
            201,
            json={
                **valid_request,
                "request_id": "abc-123",
                "status": "pending_hospital_review",
            },
        )
    )
    resp = client.post("/api/portal/access-requests", json=valid_request)
    assert resp.status_code == 201
    body = resp.json()
    assert body["request_id"] == "abc-123"
    assert body["status"] == "pending_hospital_review"


def test_create_access_request_unknown_node_is_404(client, valid_request):
    bad = dict(valid_request, requested_node_id="NOPE")
    resp = client.post("/api/portal/access-requests", json=bad)
    assert resp.status_code == 404


@respx.mock
def test_get_access_request_proxies_to_node(client, valid_request):
    respx.get("http://localhost:8001/api/access/requests/abc-123").mock(
        return_value=Response(
            200,
            json={**valid_request, "request_id": "abc-123", "status": "approved"},
        )
    )
    resp = client.get("/api/portal/access-requests/BCH/abc-123")
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


@respx.mock
def test_reviewer_queue_and_decision_proxy_to_node(client, valid_request):
    respx.get("http://localhost:8001/api/access/requests").mock(
        return_value=Response(
            200,
            json=[{**valid_request, "request_id": "abc-123", "status": "pending_hospital_review"}],
        )
    )
    list_resp = client.get("/api/portal/nodes/BCH/requests")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    respx.post("http://localhost:8001/api/access/requests/abc-123/decision").mock(
        return_value=Response(
            200,
            json={**valid_request, "request_id": "abc-123", "status": "approved", "decision_note": "ok"},
        )
    )
    decide_resp = client.post(
        "/api/portal/nodes/BCH/requests/abc-123/decision",
        json={"decision": "approved", "decision_note": "ok"},
    )
    assert decide_resp.status_code == 200
    assert decide_resp.json()["status"] == "approved"


def test_list_nodes(client):
    resp = client.get("/api/portal/nodes")
    assert resp.status_code == 200
    node_ids = {n["node_id"] for n in resp.json()}
    assert node_ids == {"BCH", "MGH", "BWH"}
