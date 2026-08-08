from pydantic import BaseModel, ConfigDict, Field

from app.models.service import ServiceCategory


class ServiceCreateIn(BaseModel):
    code: str
    name: str
    category: ServiceCategory
    price: int = Field(gt=0, description="Тиыны")
    duration_minutes: int | None = Field(None, alias="durationMinutes")

    model_config = ConfigDict(populate_by_name=True)


class ServiceUpdateIn(BaseModel):
    code: str | None = None
    name: str | None = None
    category: ServiceCategory | None = None
    price: int | None = Field(None, gt=0)
    duration_minutes: int | None = Field(None, alias="durationMinutes")
    is_active: bool | None = Field(None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)
