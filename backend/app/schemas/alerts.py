from pydantic import BaseModel, Field


class AlertEvaluationRequest(BaseModel):
    current: dict[str, float] = Field(default_factory=dict)
    previous: dict[str, float] = Field(default_factory=dict)
    thresholds: dict[str, float] | None = None
