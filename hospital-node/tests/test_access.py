VALID_REQUEST = {
    "requester_name": "Dr. Jane Researcher",
    "organization_name": "Example University",
    "requester_tier": "edu_research",
    "contact_email": "jane@example.edu",
    "research_purpose": "Studying pediatric brain MRI cohorts.",
    "query_summary": "modality=MR, body_part=BRAIN, condition_category=neoplasm",
    "requested_node_id": "BCH",
    "requested_data_level": "deidentified",
}


def test_access_config(client):
    resp = client.get("/api/access/config")
    assert resp.status_code == 200
    body = resp.json()
    assert body["node_id"] == "BCH"
    assert body["maximum_data_level"] == "deidentified"
    assert "access_contact" in body


def test_create_request_wrong_node_rejected(client):
    bad = dict(VALID_REQUEST, requested_node_id="MGH")
    resp = client.post("/api/access/requests", json=bad)
    assert resp.status_code == 400


def test_full_request_lifecycle(client):
    create_resp = client.post("/api/access/requests", json=VALID_REQUEST)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["status"] == "pending_hospital_review"
    request_id = created["request_id"]
    assert request_id

    list_resp = client.get("/api/access/requests")
    assert list_resp.status_code == 200
    assert any(r["request_id"] == request_id for r in list_resp.json())

    get_resp = client.get(f"/api/access/requests/{request_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["organization_name"] == "Example University"

    more_info_resp = client.post(
        f"/api/access/requests/{request_id}/additional-information",
        json={"note": "Please clarify data retention plan."},
    )
    assert more_info_resp.status_code == 200
    assert more_info_resp.json()["status"] == "more_information_requested"

    decision_resp = client.post(
        f"/api/access/requests/{request_id}/decision",
        json={"decision": "approved", "decision_note": "Looks good."},
    )
    assert decision_resp.status_code == 200
    decided = decision_resp.json()
    assert decided["status"] == "approved"
    assert decided["decision_note"] == "Looks good."


def test_get_unknown_request_404(client):
    resp = client.get("/api/access/requests/does-not-exist")
    assert resp.status_code == 404
