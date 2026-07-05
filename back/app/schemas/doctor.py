from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ScheduleUpdateItem(BaseModel):
    id: str
    enabled: bool
    start: str
    end: str


class DoctorProfileUpdateIn(BaseModel):
    about: str | None = None
    phone: str | None = None
    email: str | None = None
    schedule: list[ScheduleUpdateItem] | None = None

    model_config = ConfigDict(populate_by_name=True)
