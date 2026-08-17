from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.schemas.filters import DashboardFilters, get_dashboard_filters
from app.schemas.responses import DashboardResponse, dashboard_response
from app.services.ga4_service import GA4Service, get_ga4_service
from app.services.segmentation_service import SegmentationService


router = APIRouter(prefix="/segments", tags=["Segments"])


@router.get("/summary", response_model=DashboardResponse)
def segment_summary(
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
    limit: int = Query(default=10, ge=1, le=50),
) -> dict:
    return dashboard_response(SegmentationService(ga4).dashboard(filters, limit=limit), filters, ga4.property_id)
