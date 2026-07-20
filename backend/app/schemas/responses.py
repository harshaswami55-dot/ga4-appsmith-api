from typing import Any

from pydantic import BaseModel, Field


class ResponseMeta(BaseModel):
    property_id: str
    start_date: str
    end_date: str
    filters: dict[str, Any] = Field(default_factory=dict)
    cached: bool | None = None


class DashboardResponse(BaseModel):
    data: dict[str, Any]
    meta: ResponseMeta


def dashboard_response(data: dict[str, Any], filters: Any, property_id: str) -> dict[str, Any]:
    active_filters = filters.model_dump(exclude_none=True)
    return {
        "data": data,
        "meta": {
            "property_id": property_id,
            "start_date": filters.start_date,
            "end_date": filters.end_date,
            "filters": active_filters,
        },
    }

