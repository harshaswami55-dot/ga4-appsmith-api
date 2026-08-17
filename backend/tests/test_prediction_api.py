from fastapi.testclient import TestClient

from app.main import app
from app.services.prediction_service import _confidence, _linear_trend


client = TestClient(app)


def test_prediction_endpoint_contract() -> None:
    response = client.get("/api/v1/predictions/summary?start_date=14daysAgo&end_date=yesterday")
    assert response.status_code == 200
    body = response.json()
    assert "forecasts" in body["data"]
    assert body["data"]["forecasts"][0]["metric"] == "active_users"


def test_prediction_trend_calculation() -> None:
    assert _linear_trend([1, 2, 3, 4]) == 1
    assert _linear_trend([4, 3, 2, 1]) == -1


def test_prediction_confidence_requires_history() -> None:
    assert _confidence([10, 11, 12]) == "low"
    assert _confidence([100] * 30) == "high"
