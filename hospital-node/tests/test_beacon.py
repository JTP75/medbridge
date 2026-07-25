def test_beacon_info(client):
    resp = client.get("/api/beacon/info")
    assert resp.status_code == 200
    body = resp.json()
    assert body["node_id"] == "BCH"
    assert body["record_count"] > 0


def test_query_common_condition_returns_exact_count(client):
    # BCH profile: "other" has 20 records >= threshold(10) -> not suppressed
    resp = client.post(
        "/api/beacon/query",
        json={"query_id": "q1", "condition_category": "other"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["match"]["suppressed"] is False
    assert body["match"]["count"] == 20
    assert body["match"]["display_count"] == "20"


def test_query_rare_condition_is_suppressed(client):
    # BCH profile: "neoplasm" has 3 records < threshold(10) -> suppressed
    resp = client.post(
        "/api/beacon/query",
        json={"query_id": "q2", "condition_category": "neoplasm"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["match"]["suppressed"] is True
    assert body["match"]["count"] is None
    assert body["match"]["display_count"] == "<10"


def test_query_no_match_returns_zero(client):
    resp = client.post(
        "/api/beacon/query",
        json={"query_id": "q3", "modality": "XRAY"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["match"]["exists"] is False
    assert body["match"]["count"] == 0


def test_query_rejects_unknown_fields(client):
    resp = client.post(
        "/api/beacon/query",
        json={"query_id": "q4", "patient_name": "should not exist"},
    )
    assert resp.status_code == 422
