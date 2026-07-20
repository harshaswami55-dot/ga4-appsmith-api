from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.filters import DashboardFilters, get_dashboard_filters
from app.schemas.responses import DashboardResponse, dashboard_response
from app.services.ga4_service import GA4Service, get_ga4_service
from app.services.gameplay_service import GameplayService


router = APIRouter(prefix="/gameplay", tags=["Gameplay"])


@router.get("/summary", response_model=DashboardResponse)
def gameplay_summary(
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
) -> dict:
    return dashboard_response(GameplayService(ga4).dashboard(filters), filters, ga4.property_id)

