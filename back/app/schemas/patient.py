from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class PatientDiseaseOut(BaseModel):
    label: str
    variant: str

    model_config = ConfigDict(from_attributes=True)


class PatientListOut(BaseModel):
    id: int
    full_name: str
    short_name: str
    iin: str
    birth_date: date
    gender: str
    dispensary: bool
    diseases: list[PatientDiseaseOut]

    model_config = ConfigDict(from_attributes=True)


class PatientCreateIn(BaseModel):
    full_name: str = Field(alias="fullName")
    iin: str
    birth_date: date = Field(alias="birthDate")
    gender: str
    phone: str | None = None
    address: str | None = None
    blood_type: str | None = Field(None, alias="bloodType")
    dispensary: bool = False

    model_config = ConfigDict(populate_by_name=True)


class PatientUpdateIn(BaseModel):
    """Этап 1, коммит 6 (docs/PHASE1_ANALYSIS.md §6 п.7) — только
    демографические поля, медданные (аллергии/диагнозы/дозы и т.п.) сюда не
    входят, у них свои формы/эндпоинты."""

    full_name: str | None = Field(None, alias="fullName")
    iin: str | None = None
    birth_date: date | None = Field(None, alias="birthDate")
    gender: str | None = None
    phone: str | None = None
    address: str | None = None
    blood_type: str | None = Field(None, alias="bloodType")

    model_config = ConfigDict(populate_by_name=True)