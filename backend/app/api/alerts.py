from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.schemas.alerts import AlertEvaluationRequest
from app.schemas.filters import DashboardFilters, get_dashboard_filters
from app.schemas.responses import DashboardResponse, dashboard_response
from app.services.acquisition_service import AcquisitionService
from app.services.alert_rules import DEFAULT_THRESHOLDS, evaluate_core_alerts
from app.services.executive_service import ExecutiveService
from app.services.ga4_service import GA4Service, get_ga4_service
from app.services.gameplay_service import GameplayService
from app.services.onboarding_service import OnboardingService
from app.services.retention_service import RetentionService
from app.utils.dates import resolve_ga4_date


router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/rules")
def alert_rules() -> dict:
    return {
        "thresholds": DEFAULT_THRESHOLDS,
        "metrics": [
            "dau",
            "day1_retention",
            "day7_retention",
            "rolling_day7_retention",
            "onboarding_completion_rate",
            "level_dropoff_rate",
            "uninstalls",
            "churn_proxy",
        ],
    }


@router.post("/evaluate")
def evaluate_alerts(payload: AlertEvaluationRequest) -> dict:
    alerts = evaluate_core_alerts(payload.current, payload.previous, payload.thresholds)
    return {"count": len(alerts), "alerts": alerts}


@router.get("/summary", response_model=DashboardResponse)
def alert_summary(
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
) -> dict:
    previous_filters = _previous_period(filters)
    current_payloads, current_errors = _collect_dashboards(ga4, filters)
    previous_payloads, previous_errors = _collect_dashboards(ga4, previous_filters)
    current = _alert_metrics(current_payloads)
    previous = _alert_metrics(previous_payloads)
    alerts = evaluate_core_alerts(current, previous)

    return dashboard_response(
        {
            "comparison": {
                "current_period": {"start_date": filters.start_date, "end_date": filters.end_date},
                "previous_period": {
                    "start_date": previous_filters.start_date,
                    "end_date": previous_filters.end_date,
                },
            },
            "current": current,
            "previous": previous,
            "thresholds": DEFAULT_THRESHOLDS,
            "count": len(alerts),
            "alerts": alerts,
            "errors": [*current_errors, *previous_errors],
        },
        filters,
        ga4.property_id,
    )


def _previous_period(filters: DashboardFilters) -> DashboardFilters:
    start = resolve_ga4_date(filters.start_date)
    end = resolve_ga4_date(filters.end_date)
    days = max((end - start).days + 1, 1)
    previous_end = start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)
    return filters.model_copy(
        update={
            "start_date": previous_start.isoformat(),
            "end_date": previous_end.isoformat(),
        }
    )


def _collect_dashboards(ga4: GA4Service, filters: DashboardFilters) -> tuple[dict[str, dict], list[dict[str, str]]]:
    services = {
        "executive": ExecutiveService,
        "retention": RetentionService,
        "onboarding": OnboardingService,
        "gameplay": GameplayService,
        "acquisition": AcquisitionService,
    }
    payloads: dict[str, dict] = {}
    errors: list[dict[str, str]] = []
    for name, service_cls in services.items():
        try:
            payloads[name] = service_cls(ga4).dashboard(filters)
        except Exception as exc:  # Keep alert summary useful when one module lacks optional GA4 dimensions.
            payloads[name] = {}
            errors.append({"section": name, "error": str(exc)})
    return payloads, errors


def _alert_metrics(payloads: dict[str, dict]) -> dict[str, float]:
    executive = _kpis(payloads, "executive")
    retention = _kpis(payloads, "retention")
    onboarding = _kpis(payloads, "onboarding")
    gameplay = _kpis(payloads, "gameplay")
    acquisition = _kpis(payloads, "acquisition")

    return {
        "dau": _number(executive.get("dau", retention.get("dau"))),
        "day1_retention": _number(retention.get("day_1_retention_pct")),
        "day7_retention": _number(retention.get("day_7_retention_pct")),
        "rolling_day7_retention": _number(_rolling_summary(payloads.get("retention", {}), "rolling_day_7_pct")),
        "onboarding_completion_rate": _number(onboarding.get("completion_pct")),
        "level_dropoff_rate": _number(gameplay.get("drop_off_pct")),
        "uninstalls": _number(acquisition.get("uninstalls")),
        "churn_proxy": _number(acquisition.get("observed_android_churn_pct")),
    }


def _kpis(payloads: dict[str, dict], section: str) -> dict[str, Any]:
    return payloads.get(section, {}).get("kpis", {})


def _number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _rolling_summary(retention_payload: dict, key: str) -> Any:
    for row in retention_payload.get("rolling_retention_table", []):
        if row.get("cohort") == "All Users":
            return row.get(key)
    return None
