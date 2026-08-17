from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_alert_rules_endpoint() -> None:
    response = client.get("/api/v1/alerts/rules")
    assert response.status_code == 200
    body = response.json()
    assert "dau_relative_drop" in body["thresholds"]


def test_alert_evaluate_endpoint() -> None:
    response = client.post(
        "/api/v1/alerts/evaluate",
        json={"current": {"dau": 70}, "previous": {"dau": 100}},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["alerts"][0]["code"] == "DAU_DROP"


def test_segment_summary_contract() -> None:
    response = client.get("/api/v1/segments/summary?start_date=7daysAgo&end_date=yesterday&limit=3")
    assert response.status_code == 200
    body = response.json()
    assert "country" in body["data"]["segments"]
    assert "level_difficulty" in body["data"]
