from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.config import get_settings
from app.services.ga4_service import GA4QueryError, get_ga4_service


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Secure GA4 analytics backend for the Sumlink Appsmith dashboard.",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=settings.cors_origin_list != ["*"],
    allow_methods=["GET", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "x-api-key"],
)
app.include_router(api_router, prefix=settings.api_prefix)
app.include_router(api_router, prefix="")



@app.exception_handler(GA4QueryError)
async def ga4_error_handler(_: Request, exc: GA4QueryError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"error": {"code": exc.code, "message": str(exc)}})


@app.get("/health", tags=["Operations"])
def health() -> dict:
    return {"status": "ok", "service": settings.app_name, "version": "1.0.0"}


@app.get("/ready", tags=["Operations"])
def readiness() -> dict:
    return {"status": "ready", "ga4": get_ga4_service().test_connection()}

