import hashlib
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.api_core.exceptions import GoogleAPICallError
from google.oauth2 import service_account

from app.config import Settings, get_settings
from app.schemas.filters import DashboardFilters
from app.utils.cache import TTLCache
from app.utils.dates import resolve_ga4_date
from app.utils.numbers import number


class GA4QueryError(RuntimeError):
    def __init__(self, message: str, *, code: str = "GA4_QUERY_FAILED"):
        super().__init__(message)
        self.code = code


def _exact_filter(field_name: str, value: str) -> dict[str, Any]:
    return {
        "filter": {
            "field_name": field_name,
            "string_filter": {
                "match_type": "EXACT",
                "value": value,
                "case_sensitive": False,
            },
        }
    }


def in_list_filter(field_name: str, values: list[str]) -> dict[str, Any]:
    return {
        "filter": {
            "field_name": field_name,
            "in_list_filter": {"values": values, "case_sensitive": True},
        }
    }


def and_filters(*expressions: dict[str, Any] | None) -> dict[str, Any] | None:
    selected = [expression for expression in expressions if expression]
    if not selected:
        return None
    if len(selected) == 1:
        return selected[0]
    return {"and_group": {"expressions": selected}}


class GA4Service:
    def __init__(
        self,
        settings: Settings | None = None,
        client: BetaAnalyticsDataClient | None = None,
    ):
        self.settings = settings or get_settings()
        self.property_id = self.settings.ga4_property_id
        self.cache = TTLCache(self.settings.cache_ttl_seconds)
        self.client = client or self._build_client()

    def _build_client(self) -> BetaAnalyticsDataClient:
        credential_path = self.settings.google_application_credentials
        if credential_path:
            path = Path(credential_path).expanduser()
            if not path.is_file():
                raise GA4QueryError(
                    f"Credential file does not exist: {path}",
                    code="CREDENTIAL_FILE_NOT_FOUND",
                )
            credentials = service_account.Credentials.from_service_account_file(
                path,
                scopes=["https://www.googleapis.com/auth/analytics.readonly"],
            )
            return BetaAnalyticsDataClient(credentials=credentials)
        return BetaAnalyticsDataClient()

    def dimension_filter(self, filters: DashboardFilters) -> dict[str, Any] | None:
        mapping = {
            "country": ("country", filters.country),
            "platform": ("platform", filters.platform),
            "device_category": ("deviceCategory", filters.device_category),
            "device_model": ("mobileDeviceModel", filters.device_model),
            "os_version": ("operatingSystemVersion", filters.os_version),
            "app_version": ("appVersion", filters.app_version),
            "traffic_source": ("sessionSource", filters.traffic_source),
            "campaign": ("sessionCampaignName", filters.campaign),
            "user_type": ("newVsReturning", filters.user_type),
        }
        expressions = [_exact_filter(dimension, value) for dimension, value in mapping.values() if value]

        if filters.level_number:
            if not self.settings.level_dimension:
                raise GA4QueryError("LEVEL_DIMENSION is required for level_number filters", code="MISSING_CUSTOM_DEFINITION")
            expressions.append(_exact_filter(self.settings.level_dimension, filters.level_number))
        if filters.tutorial_step:
            if not self.settings.tutorial_step_dimension:
                raise GA4QueryError("TUTORIAL_STEP_DIMENSION is required for tutorial_step filters", code="MISSING_CUSTOM_DEFINITION")
            expressions.append(_exact_filter(self.settings.tutorial_step_dimension, filters.tutorial_step))

        return and_filters(*expressions)

    def run_report(
        self,
        *,
        filters: DashboardFilters,
        metrics: list[str],
        dimensions: list[str] | None = None,
        extra_filter: dict[str, Any] | None = None,
        limit: int = 1000,
        order_bys: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        request: dict[str, Any] = {
            "property": f"properties/{self.property_id}",
            "date_ranges": [{"start_date": filters.start_date, "end_date": filters.end_date}],
            "metrics": [{"name": metric} for metric in metrics],
            "dimensions": [{"name": dimension} for dimension in (dimensions or [])],
            "limit": limit,
            "keep_empty_rows": True,
        }
        combined_filter = and_filters(self.dimension_filter(filters), extra_filter)
        if combined_filter:
            request["dimension_filter"] = combined_filter
        if order_bys:
            request["order_bys"] = order_bys
        return self._execute(request)

    def run_cohort_report(
        self,
        *,
        filters: DashboardFilters,
        end_offset: int = 30,
    ) -> list[dict[str, Any]]:
        cohort_start = resolve_ga4_date(filters.start_date).isoformat()
        cohort_end = resolve_ga4_date(filters.end_date).isoformat()
        request: dict[str, Any] = {
            "property": f"properties/{self.property_id}",
            "dimensions": [{"name": "cohort"}, {"name": "cohortNthDay"}],
            "metrics": [{"name": "cohortActiveUsers"}, {"name": "cohortTotalUsers"}],
            "cohort_spec": {
                "cohorts": [
                    {
                        "name": "selected_cohort",
                        "dimension": "firstSessionDate",
                        "date_range": {"start_date": cohort_start, "end_date": cohort_end},
                    }
                ],
                "cohorts_range": {
                    "granularity": "DAILY",
                    "start_offset": 0,
                    "end_offset": end_offset,
                },
            },
            "limit": 1000,
        }
        dimension_filter = self.dimension_filter(filters)
        if dimension_filter:
            request["dimension_filter"] = dimension_filter
        return self._execute(request)

    def _execute(self, request: dict[str, Any]) -> list[dict[str, Any]]:
        cache_key = hashlib.sha256(json.dumps(request, sort_keys=True).encode("utf-8")).hexdigest()
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            response = self.client.run_report(request=request, timeout=30)
        except GoogleAPICallError as exc:
            raise GA4QueryError(self._friendly_error(str(exc))) from exc
        except Exception as exc:
            raise GA4QueryError(self._friendly_error(str(exc))) from exc

        dimension_names = [header.name for header in response.dimension_headers]
        metric_names = [header.name for header in response.metric_headers]
        rows: list[dict[str, Any]] = []
        for row in response.rows:
            item: dict[str, Any] = {}
            item.update(zip(dimension_names, (value.value for value in row.dimension_values)))
            item.update(zip(metric_names, (number(value.value) for value in row.metric_values)))
            rows.append(item)
        self.cache.set(cache_key, rows)
        return rows

    @staticmethod
    def _friendly_error(message: str) -> str:
        lowered = message.lower()
        if "custom" in lowered and ("dimension" in lowered or "metric" in lowered):
            return f"GA4 custom definition is unavailable. Register it in GA4 or update .env. Details: {message}"
        if "permission" in lowered or "forbidden" in lowered:
            return "GA4 denied access. Grant the service account Viewer access to the property."
        return message

    def test_connection(self) -> dict[str, Any]:
        filters = DashboardFilters(start_date="yesterday", end_date="yesterday")
        rows = self.run_report(filters=filters, metrics=["activeUsers"])
        return {"connected": True, "active_users_yesterday": rows[0]["activeUsers"] if rows else 0}


@lru_cache
def get_ga4_service() -> GA4Service:
    return GA4Service()
