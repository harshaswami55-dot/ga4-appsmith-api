from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.filters import DashboardFilters, get_dashboard_filters
from app.schemas.responses import DashboardResponse, dashboard_response
from app.services.executive_service import ExecutiveService
from app.services.ga4_service import GA4Service, get_ga4_service


router = APIRouter(prefix="/executive", tags=["Executive"])


@router.get("/summary", response_model=DashboardResponse)
def executive_summary(
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
) -> dict:
    data = ExecutiveService(ga4).dashboard(filters)
    return dashboard_response(data, filters, ga4.property_id)

