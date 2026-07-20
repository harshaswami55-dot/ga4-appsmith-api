import secrets
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.config import get_settings


def verify_api_key(x_api_key: Annotated[str | None, Header()] = None) -> None:
    settings = get_settings()
    if not settings.auth_enabled:
        return
    if not x_api_key or not any(secrets.compare_digest(x_api_key, key) for key in settings.api_key_set):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid X-API-Key header is required",
        )

