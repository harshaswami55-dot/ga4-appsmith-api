from fastapi import HTTPException
import pytest

from app.auth import dependencies
from app.config.settings import Settings


def test_api_key_authentication(monkeypatch) -> None:
    settings = Settings(_env_file=None, auth_enabled=True, api_keys="first-key,second-key")
    monkeypatch.setattr(dependencies, "get_settings", lambda: settings)
    dependencies.verify_api_key("second-key")
    with pytest.raises(HTTPException) as exc_info:
        dependencies.verify_api_key("wrong-key")
    assert exc_info.value.status_code == 401


def test_production_cannot_disable_authentication() -> None:
    with pytest.raises(ValueError, match="Production requires"):
        Settings(_env_file=None, environment="production", auth_enabled=False, api_keys="")
