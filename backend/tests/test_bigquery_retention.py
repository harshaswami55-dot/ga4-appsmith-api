from datetime import date

from app.config.settings import Settings
from app.schemas.filters import DashboardFilters
from app.services.bigquery_retention_service import BigQueryRetentionService


class FakeJob:
    def __init__(self, rows):
        self.rows = rows

    def result(self):
        return self.rows


class FakeClient:
    def __init__(self, rows):
        self.rows = rows
        self.sql = ""
        self.job_config = None
        self.location = None

    def query(self, sql, job_config=None, location=None):
        self.sql = sql
        self.job_config = job_config
        self.location = location
        return FakeJob(self.rows)


def test_bigquery_rolling_retention_uses_mature_scan_window_and_formats_rows() -> None:
    settings = Settings(
        _env_file=None,
        auth_enabled=False,
        bigquery_enabled=True,
        bigquery_project_id="ga-biquery-analytics",
        bigquery_dataset="analytics_516899630",
        bigquery_location="US",
    )
    client = FakeClient(
        [
            {
                "cohort": "2026-07-01",
                "users": 10,
                "rolling_day_1_users": 4,
                "rolling_day_1_pct": 40,
                "rolling_day_3_users": 3,
                "rolling_day_3_pct": 30,
                "rolling_day_7_users": 2,
                "rolling_day_7_pct": 20,
                "rolling_day_15_users": 1,
                "rolling_day_15_pct": 10,
                "method": "BigQuery exact user-level",
            }
        ]
    )
    service = BigQueryRetentionService(settings, client=client)

    rows = service.rolling_retention_table(
        DashboardFilters(start_date="2026-07-01", end_date="2026-07-15")
    )

    assert rows[0]["rolling_day_15_pct"] == 10
    assert client.location == "US"
    assert "DATE(TIMESTAMP_MICROS(user_first_touch_timestamp)) AS first_touch_date" in client.sql
    assert "DATE_DIFF(a.activity_date, c.cohort_date, DAY) >= 15" in client.sql
    params = {param.name: param.value for param in client.job_config.query_parameters}
    assert params["start_suffix"] == "20260701"
    assert params["end_suffix"] == "20260730"
    assert params["cohort_start"] == date(2026, 7, 1)
    assert params["cohort_end"] == date(2026, 7, 15)
