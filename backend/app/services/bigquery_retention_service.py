import base64
import json
from datetime import timedelta
from pathlib import Path
from typing import Any

from google.cloud import bigquery
from google.oauth2 import service_account

from app.config import Settings, get_settings
from app.schemas.filters import DashboardFilters
from app.utils.dates import resolve_ga4_date


class BigQueryRetentionService:
    ROLLING_RETENTION_DAYS = (1, 3, 7, 15)
    MAX_VISIBLE_COHORTS = 10

    def __init__(self, settings: Settings | None = None, client: bigquery.Client | None = None):
        self.settings = settings or get_settings()
        self.project_id = self.settings.bigquery_project_id
        self.dataset = self.settings.bigquery_dataset
        self.client = client

    @property
    def enabled(self) -> bool:
        return bool(self.settings.bigquery_enabled and self.project_id and self.dataset)

    def rolling_retention_table(self, filters: DashboardFilters) -> list[dict]:
        if not self.enabled:
            return []
        if self.client is None:
            self.client = self._build_client()

        start_date = resolve_ga4_date(filters.start_date)
        end_date = resolve_ga4_date(filters.end_date)
        scan_end_date = end_date + timedelta(days=max(self.ROLLING_RETENTION_DAYS))

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("start_suffix", "STRING", start_date.strftime("%Y%m%d")),
                bigquery.ScalarQueryParameter("end_suffix", "STRING", scan_end_date.strftime("%Y%m%d")),
                bigquery.ScalarQueryParameter("cohort_start", "DATE", start_date),
                bigquery.ScalarQueryParameter("cohort_end", "DATE", end_date),
                *self._filter_params(filters),
            ]
        )
        rows = list(
            self.client.query(
                self._rolling_retention_sql(),
                job_config=job_config,
                location=self.settings.bigquery_location,
            ).result()
        )
        return [self._format_row(dict(row)) for row in rows]

    def _build_client(self) -> bigquery.Client:
        credentials = None
        if self.settings.google_service_account_json_base64:
            info = json.loads(base64.b64decode(self.settings.google_service_account_json_base64).decode("utf-8"))
            credentials = service_account.Credentials.from_service_account_info(
                info,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
        elif self.settings.google_service_account_json:
            credentials = service_account.Credentials.from_service_account_info(
                json.loads(self.settings.google_service_account_json),
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
        elif self.settings.google_application_credentials:
            path = Path(self.settings.google_application_credentials).expanduser()
            credentials = service_account.Credentials.from_service_account_file(
                path,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )

        return bigquery.Client(project=self.project_id, credentials=credentials)

    def _rolling_retention_sql(self) -> str:
        table = f"`{self.project_id}.{self.dataset}.events_*`"
        day_selects = ",\n        ".join(
            f"COUNT(DISTINCT IF(DATE_DIFF(a.activity_date, c.cohort_date, DAY) >= {day}, c.user_pseudo_id, NULL)) AS rolling_day_{day}_users"
            for day in self.ROLLING_RETENTION_DAYS
        )
        visible_selects = ",\n        ".join(
            [
                item
                for day in self.ROLLING_RETENTION_DAYS
                for item in (
                    f"rolling_day_{day}_users",
                    f"SAFE_DIVIDE(rolling_day_{day}_users, users) * 100 AS rolling_day_{day}_pct",
                )
            ]
        )
        summary_selects = ",\n        ".join(
            [
                item
                for day in self.ROLLING_RETENTION_DAYS
                for item in (
                    f"SUM(rolling_day_{day}_users) AS rolling_day_{day}_users",
                    f"SAFE_DIVIDE(SUM(rolling_day_{day}_users), SUM(users)) * 100 AS rolling_day_{day}_pct",
                )
            ]
        )

        return f"""
WITH raw_events AS (
    SELECT
        user_pseudo_id,
        PARSE_DATE('%Y%m%d', event_date) AS event_date,
        DATE(TIMESTAMP_MICROS(user_first_touch_timestamp)) AS first_touch_date,
        platform,
        app_info.version AS app_version,
        device.operating_system_version AS os_version,
        device.mobile_model_name AS device_model,
        device.category AS device_category,
        geo.country AS country,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'level_number') AS level_number,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'tutorial_step') AS tutorial_step
    FROM {table}
    WHERE _TABLE_SUFFIX BETWEEN @start_suffix AND @end_suffix
      AND user_pseudo_id IS NOT NULL
),
events AS (
    SELECT *
    FROM raw_events
    WHERE TRUE
      {self._filters_sql()}
),
first_seen AS (
    SELECT user_pseudo_id, MIN(COALESCE(first_touch_date, event_date)) AS cohort_date
    FROM events
    GROUP BY user_pseudo_id
),
cohort_users AS (
    SELECT user_pseudo_id, cohort_date
    FROM first_seen
    WHERE cohort_date BETWEEN @cohort_start AND @cohort_end
),
activity AS (
    SELECT DISTINCT user_pseudo_id, event_date AS activity_date
    FROM events
),
per_cohort AS (
    SELECT
        FORMAT_DATE('%Y-%m-%d', c.cohort_date) AS cohort,
        c.cohort_date,
        COUNT(DISTINCT c.user_pseudo_id) AS users,
        {day_selects},
        'BigQuery exact user-level' AS method
    FROM cohort_users c
    LEFT JOIN activity a
      ON a.user_pseudo_id = c.user_pseudo_id
     AND a.activity_date >= c.cohort_date
    GROUP BY c.cohort_date
),
visible AS (
    SELECT
        cohort,
        users,
        {visible_selects},
        method,
        cohort_date,
        0 AS sort_group
    FROM per_cohort
    ORDER BY cohort_date
    LIMIT {self.MAX_VISIBLE_COHORTS}
),
summary AS (
    SELECT
        'All Users' AS cohort,
        SUM(users) AS users,
        {summary_selects},
        'BigQuery exact user-level weighted' AS method,
        CAST(NULL AS DATE) AS cohort_date,
        1 AS sort_group
    FROM per_cohort
)
SELECT * EXCEPT(cohort_date, sort_group)
FROM (
    SELECT * FROM visible
    UNION ALL
    SELECT * FROM summary
)
ORDER BY sort_group, cohort
"""

    def _filters_sql(self) -> str:
        mapping = {
            "country": "country",
            "platform": "platform",
            "device_category": "device_category",
            "device_model": "device_model",
            "os_version": "os_version",
            "app_version": "app_version",
            "level_number": "level_number",
            "tutorial_step": "tutorial_step",
        }
        return "\n      ".join(f"AND (@{name} IS NULL OR {column} = @{name})" for name, column in mapping.items())

    def _filter_params(self, filters: DashboardFilters) -> list[bigquery.ScalarQueryParameter]:
        names = [
            "country",
            "platform",
            "device_category",
            "device_model",
            "os_version",
            "app_version",
            "level_number",
            "tutorial_step",
        ]
        return [bigquery.ScalarQueryParameter(name, "STRING", getattr(filters, name)) for name in names]

    def _format_row(self, row: dict[str, Any]) -> dict:
        output = {
            "cohort": row.get("cohort", ""),
            "users": int(row.get("users") or 0),
            "method": row.get("method") or "BigQuery exact user-level",
        }
        for day in self.ROLLING_RETENTION_DAYS:
            users = row.get(f"rolling_day_{day}_users")
            output[f"rolling_day_{day}_users"] = int(users) if users is not None else None
            pct = row.get(f"rolling_day_{day}_pct")
            output[f"rolling_day_{day}_pct"] = round(float(pct), 2) if pct is not None else None
        return output
