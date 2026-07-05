from pydantic import BaseModel, ConfigDict, Field

from app.models.appointment import AppointmentStatus


class DiagnosisIn(BaseModel):
    code: str
    name: str


class PrescriptionIn(BaseModel):
    medication: str = ""
    dosage: str = ""
    duration: str = ""


class AppointmentUpdateIn(BaseModel):
    complaints: str | None = None
    objective_status: str | None = Field(None, alias="objectiveStatus")
    diagnoses: list[DiagnosisIn] | None = None
    prescriptions: list[PrescriptionIn] | None = None
    status: AppointmentStatus | None = None

    model_config = ConfigDict(populate_by_name=True)
