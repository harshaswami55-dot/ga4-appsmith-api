from typing import Annotated
from fastapi import APIRouter, Depends

from app.schemas.filters import DashboardFilters, get_dashboard_filters
from app.schemas.responses import DashboardResponse, dashboard_response
from app.services.acquisition_service import AcquisitionService
from app.services.executive_service import ExecutiveService
from app.services.ga4_service import GA4Service, get_ga4_service
from app.services.gameplay_service import GameplayService
from app.services.onboarding_service import OnboardingService
from app.services.retention_service import RetentionService

alias_router = APIRouter(tags=["Aliases"])


@alias_router.get("/api/executive-health", response_model=DashboardResponse)
@alias_router.get("/api/dau-mau", response_model=DashboardResponse)
@alias_router.get("/api/never-played", response_model=DashboardResponse)
def executive_alias(
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
) -> dict:
    data = ExecutiveService(ga4).dashboard(filters)
    return dashboard_response(data, filters, ga4.property_id)


@alias_router.get("/api/acquisition-churn", response_model=DashboardResponse)
def acquisition_alias(
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
) -> dict:
    return dashboard_response(AcquisitionService(ga4).dashboard(filters), filters, ga4.property_id)


@alias_router.get("/api/onboarding-funnel", response_model=DashboardResponse)
@alias_router.get("/api/tutorial-frustration", response_model=DashboardResponse)
@alias_router.get("/api/tutorial-skip", response_model=DashboardResponse)
def onboarding_alias(
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
) -> dict:
    return dashboard_response(OnboardingService(ga4).dashboard(filters), filters, ga4.property_id)


@alias_router.get("/api/gameplay-balancing", response_model=DashboardResponse)
@alias_router.get("/api/level-difficulty", response_model=DashboardResponse)
def gameplay_alias(
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
) -> dict:
    return dashboard_response(GameplayService(ga4).dashboard(filters), filters, ga4.property_id)


@alias_router.get("/api/retention", response_model=DashboardResponse)
def retention_alias(
    filters: Annotated[DashboardFilters, Depends(get_dashboard_filters)],
    ga4: Annotated[GA4Service, Depends(get_ga4_service)],
) -> dict:
    return dashboard_response(RetentionService(ga4).dashboard(filters), filters, ga4.property_id)
