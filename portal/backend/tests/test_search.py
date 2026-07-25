import respx
from httpx import Response


def _node_response(node_id: str, exists, count, display_count, suppressed, reason=None):
    return {
        "query_id": "q1",
        "node_id": node_id,
        "match": {
            "exists": exists,
            "count": count,
            "display_count": display_count,
            "suppressed": suppressed,
            "suppression_reason": reason,
        },
        "available_data": ["deidentified-imaging-metadata"],
        "access_request_supported": True,
    }


@respx.mock
def test_search_suppresses_total_when_any_node_suppressed(client):
    respx.post("http://localhost:8001/api/beacon/query").mock(
        return_value=Response(200, json=_node_response("BCH", True, 12, "12", False))
    )
    respx.post("http://localhost:8002/api/beacon/query").mock(
        return_value=Response(200, json=_node_response("MGH", True, 8, "8", False))
    )
    respx.post("http://localhost:8003/api/beacon/query").mock(
        return_value=Response(
            200,
            json=_node_response("BWH", True, None, "<10", True, "small_cohort"),
        )
    )

    resp = client.post(
        "/api/portal/search",
        json={"query_id": "q1", "condition_category": "neoplasm"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["any_suppressed"] is True
    assert body["total_count"] is None
    assert body["message"]
    assert len(body["node_responses"]) == 3


@respx.mock
def test_search_sums_counts_when_nothing_suppressed(client):
    respx.post("http://localhost:8001/api/beacon/query").mock(
        return_value=Response(200, json=_node_response("BCH", True, 12, "12", False))
    )
    respx.post("http://localhost:8002/api/beacon/query").mock(
        return_value=Response(200, json=_node_response("MGH", True, 20, "20", False))
    )
    respx.post("http://localhost:8003/api/beacon/query").mock(
        return_value=Response(200, json=_node_response("BWH", True, 15, "15", False))
    )

    resp = client.post(
        "/api/portal/search",
        json={"query_id": "q2", "condition_category": "other"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["any_suppressed"] is False
    assert body["total_count"] == 47
    assert body["message"] is None


@respx.mock
def test_search_handles_a_node_being_down(client):
    respx.post("http://localhost:8001/api/beacon/query").mock(
        return_value=Response(200, json=_node_response("BCH", True, 12, "12", False))
    )
    respx.post("http://localhost:8002/api/beacon/query").mock(side_effect=Exception("boom"))
    respx.post("http://localhost:8003/api/beacon/query").mock(
        return_value=Response(200, json=_node_response("BWH", True, 15, "15", False))
    )

    resp = client.post(
        "/api/portal/search",
        json={"query_id": "q3"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_count"] is None
    assert len(body["node_errors"]) == 1
    assert body["node_errors"][0]["node_id"] == "MGH"
    assert len(body["node_responses"]) == 2
