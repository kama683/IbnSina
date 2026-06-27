from datetime import date

from pydantic import BaseModel, ConfigDict


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