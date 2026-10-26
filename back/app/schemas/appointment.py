from datetime import date as Date

from pydantic import BaseModel, ConfigDict, Field

from app.models.appointment import AppointmentStatus, CancellationReasonCode


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
    # Этап 1, коммит 5 (docs/PHASE1_ANALYSIS.md §6 п.3) — перенос и отмена.
    date: Date | None = None
    # Перенос к другому врачу (тот же PATCH с date/employeeId).
    employee_id: int | None = Field(None, alias="employeeId")
    # Отмена: код причины обязателен; для other — ещё и текст.
    cancellation_reason_code: CancellationReasonCode | None = Field(
        None, alias="cancellationReasonCode"
    )
    cancellation_reason: str | None = Field(None, alias="cancellationReason")

    model_config = ConfigDict(populate_by_name=True)


class AppointmentCreateIn(BaseModel):
    patient_id: int = Field(alias="patientId")
    employee_id: int = Field(alias="employeeId")
    date: Date
    complaint: str

    model_config = ConfigDict(populate_by_name=True)
