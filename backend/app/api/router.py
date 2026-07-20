from fastapi import APIRouter, Depends

from app.api import acquisition, executive, export, gameplay, onboarding, retention, settings
from app.auth import verify_api_key


api_router = APIRouter(dependencies=[Depends(verify_api_key)])
api_router.include_router(executive.router)
api_router.include_router(acquisition.router)
api_router.include_router(onboarding.router)
api_router.include_router(gameplay.router)
api_router.include_router(retention.router)
api_router.include_router(export.router)
api_router.include_router(settings.router)

