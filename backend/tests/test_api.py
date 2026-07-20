from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app
from app.services.ga4_service import get_ga4_service


class FakeGA4:
    property_id = "516899630"
    settings = SimpleNamespace(
        event_install="first_open",
        event_tutorial_start="tutorial_step",
        event_tutorial_complete="tutorial_completed",
        event_tutorial_fail="tutorial_match_failed",
        event_tutorial_skip="tutorial_skipped",
        event_level_start="level_start",
        event_level_complete="level_complete",
        event_hint_used="hint_used_successfully",
        level_dimension="customEvent:level_number",
        tutorial_step_dimension="",
        level_time_metric="",
        tutorial_time_metric="",
    )

    def run_report(self, *, filters, metrics, dimensions=None, **kwargs):
        dimensions = dimensions or []
        if dimensions == ["date"]:
            return [
                {"date": "20260718", "activeUsers": 8, "newUsers": 2, "sessions": 10, "screenPageViews": 20},
                {"date": "20260719", "activeUsers": 10, "newUsers": 3, "sessions": 12, "screenPageViews": 24},
            ]
        if metrics == ["activeUsers"]:
            return [{"activeUsers": 100}]
        return [{
            "activeUsers": 100,
            "newUsers": 25,
            "sessions": 140,
            "screenPageViews": 500,
            "engagementRate": 0.6,
        }]


app.dependency_overrides[get_ga4_service] = lambda: FakeGA4()
client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_executive_summary_contract() -> None:
    response = client.get("/api/v1/executive/summary?start_date=7daysAgo&end_date=yesterday")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["kpis"]["dau"] == 10
    assert body["data"]["kpis"]["mau"] == 100
    assert body["data"]["kpis"]["stickiness_pct"] == 10
    assert body["data"]["kpis"]["engagement_rate_pct"] == 60
    assert body["meta"]["property_id"] == "516899630"


def test_invalid_filter_returns_422() -> None:
    response = client.get("/api/v1/executive/summary?platform=Windows")
    assert response.status_code == 422


def test_reversed_dates_return_422() -> None:
    response = client.get(
        "/api/v1/executive/summary?start_date=2026-07-20&end_date=2026-07-01"
    )
    assert response.status_code == 422
