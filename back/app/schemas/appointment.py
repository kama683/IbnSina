from datetime import date as Date

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
    duration_minutes: int | None = Field(None, alias="durationMinutes")

    model_config = ConfigDict(populate_by_name=True)


class AppointmentCreateIn(BaseModel):
    patient_id: int = Field(alias="patientId")
    employee_id: int = Field(alias="employeeId")
    date: Date
    time: str
    complaint: str

    model_config = ConfigDict(populate_by_name=True)
