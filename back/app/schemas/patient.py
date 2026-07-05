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
    area: str
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
    area: str
    blood_type: str | None = Field(None, alias="bloodType")
    dispensary: bool = False

    model_config = ConfigDict(populate_by_name=True)