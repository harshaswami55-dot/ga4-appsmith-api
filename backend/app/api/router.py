from fastapi import APIRouter, Depends

from app.api import (
    acquisition,
    alerts,
    aliases,
    executive,
    export,
    gameplay,
    onboarding,
    predictions,
    retention,
    segments,
    settings,
)
from app.auth import verify_api_key


api_router = APIRouter(dependencies=[Depends(verify_api_key)])
api_router.include_router(executive.router)
api_router.include_router(acquisition.router)
api_router.include_router(onboarding.router)
api_router.include_router(gameplay.router)
api_router.include_router(retention.router)
api_router.include_router(segments.router)
api_router.include_router(alerts.router)
api_router.include_router(predictions.router)
api_router.include_router(export.router)
api_router.include_router(settings.router)
api_router.include_router(aliases.alias_router)
