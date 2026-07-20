import csv
import io
import json
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, Query, Response

from app.schemas.filters import DashboardFilters, get_dashboard_filters
from app.services.acquisition_service import AcquisitionService
from app.services.executive_service import ExecutiveService
from app.services.ga4_service import GA4Service, get_ga4_service
from app.services.gameplay_service import GameplayService
from app.services.onboarding_service import OnboardingService
from app.services.retention_service import RetentionService


router = APIRouter(prefix="/export", tags=["Export"])
DashboardName = Literal["executive", "acquisition", "onboarding", "gameplay", "retention"]


def _flatten(value: Any, path: str = "") -> list[tuple[str, Any]]:
    if isinstance(value, dict):
        rows: list[tuple[str, Any]] = []
        for key, child in value.items():
            rows.extend(_flatten(child, f"{path}.{key}" if path else str(key)))
        return rows
    if isinstance(value, list):
        rows = []
        for index, child in enumerate(value):
            rows.extend(_flatten(child, f"{path}[{index}]"))
        return rows
    return [(path, value)]


@router.get("/{dashboard}")
def export_dashboard(
    dashboard: DashboardName,
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
    file_format: Annotated[Literal["csv", "json"], Query(alias="format")] = "csv",
) -> Response:
    services = {
        "executive": ExecutiveService,
        "acquisition": AcquisitionService,
        "onboarding": OnboardingService,
        "gameplay": GameplayService,
        "retention": RetentionService,
    }
    data = services[dashboard](ga4).dashboard(filters)
    filename = f"sumlink-{dashboard}-{filters.start_date}-{filters.end_date}.{file_format}"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    if file_format == "json":
        return Response(
            content=json.dumps(data, indent=2, default=str),
            media_type="application/json",
            headers=headers,
        )
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["field", "value"])
    writer.writerows(_flatten(data))
    return Response(content=stream.getvalue(), media_type="text/csv", headers=headers)

