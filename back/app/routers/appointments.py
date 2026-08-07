from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models.appointment import Appointment, AppointmentStatus
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.user import User
from app.schemas.appointment import AppointmentCreateIn, AppointmentUpdateIn

router = APIRouter()

MONTHS_GENITIVE = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
]


def _week_bounds(base: date | None = None) -> tuple[date, date]:
    today = base or date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=5)
    return week_start, week_end


def _format_week_period(week_start: date, week_end: date) -> str:
    if week_start.month == week_end.month:
        return (
            f"{week_start.day}–{week_end.day} "
            f"{MONTHS_GENITIVE[week_start.month - 1]} {week_start.year}"
        )
    return (
        f"{week_start.day} {MONTHS_GENITIVE[week_start.month - 1]} – "
        f"{week_end.day} {MONTHS_GENITIVE[week_end.month - 1]} {week_end.year}"
    )


def _serialize_appointment(appointment: Appointment) -> dict:
    return {
        "id": str(appointment.id),
        "patientId": str(appointment.patient_id),
        "date": appointment.date.strftime("%d.%m.%Y"),
        "time": appointment.time,
        "patient": appointment.patient.short_name,
        "complaint": appointment.complaint,
        "diagnosis": appointment.diagnosis,
        "doctor": appointment.doctor.short_name,
        "status": appointment.status.value,
    }


def _query_appointments(db: Session, from_date: date, to_date: date) -> list[Appointment]:
    return (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
        )
        .filter(Appointment.date >= from_date, Appointment.date <= to_date)
        .order_by(Appointment.date, Appointment.time)
        .all()
    )


@router.get("")
def list_appointments(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    rows = _query_appointments(db, from_date, to_date)
    return [_serialize_appointment(row) for row in rows]


@router.get("/week")
def get_week_appointments(db: Session = Depends(get_db)):
    week_start, week_end = _week_bounds()
    rows = _query_appointments(db, week_start, week_end)
    return [_serialize_appointment(row) for row in rows]


@router.get("/stats/week")
def get_week_stats(db: Session = Depends(get_db)):
    week_start, week_end = _week_bounds()

    week_appointments = _query_appointments(db, week_start, week_end)
    total = len(week_appointments)
    completed = sum(
        1 for row in week_appointments if row.status == AppointmentStatus.completed
    )
    cancelled = sum(
        1 for row in week_appointments if row.status == AppointmentStatus.cancelled
    )

    first_visit_subq = (
        db.query(
            Appointment.patient_id.label("patient_id"),
            func.min(Appointment.date).label("first_date"),
        )
        .group_by(Appointment.patient_id)
        .subquery()
    )
    new_patients = (
        db.query(first_visit_subq.c.patient_id)
        .filter(
            first_visit_subq.c.first_date >= week_start,
            first_visit_subq.c.first_date <= week_end,
        )
        .count()
    )

    dispensary = (
        db.query(Appointment)
        .join(Patient, Appointment.patient_id == Patient.id)
        .filter(
            Appointment.date >= week_start,
            Appointment.date <= week_end,
            Patient.dispensary.is_(True),
            Appointment.status != AppointmentStatus.cancelled,
        )
        .count()
    )

    completed_durations = [
        row.duration_minutes
        for row in week_appointments
        if row.status == AppointmentStatus.completed and row.duration_minutes
    ]
    avg_minutes = (
        round(sum(completed_durations) / len(completed_durations))
        if completed_durations
        else 0
    )

    return {
        "period": _format_week_period(week_start, week_end),
        "total": total,
        "completed": completed,
        "cancelled": cancelled,
        "newPatients": new_patients,
        "dispensary": dispensary,
        "avgMinutes": avg_minutes,
    }


@router.get("/queue")
def get_queue_appointments(db: Session = Depends(get_db)):
    today = date.today()
    rows = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
        )
        .filter(
            Appointment.date == today,
            Appointment.status.in_(
                [AppointmentStatus.scheduled, AppointmentStatus.in_progress]
            ),
        )
        .order_by(Appointment.time)
        .all()
    )
    return [_serialize_appointment(row) for row in rows]


@router.get("/today")
def get_today_appointments(db: Session = Depends(get_db)):
    today = date.today()
    rows = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
        )
        .filter(Appointment.date == today)
        .order_by(Appointment.time)
        .all()
    )
    return [_serialize_appointment(row) for row in rows]


@router.get("/current")
def get_current_appointment(db: Session = Depends(get_db)):
    today = date.today()
    row = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
        )
        .filter(
            Appointment.date == today,
            Appointment.status == AppointmentStatus.in_progress,
        )
        .first()
    )
    if not row:
        return None
    return _serialize_appointment(row)


@router.post("")
def create_appointment(
    payload: AppointmentCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.doctor import Doctor

    doctor = db.query(Doctor).filter(Doctor.id == current_user.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Врач не найден")

    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")

    conflict = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.date == payload.date,
            Appointment.time == payload.time,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail="На это время уже есть приём")

    appointment = Appointment(
        date=payload.date,
        time=payload.time,
        complaint=payload.complaint,
        status=AppointmentStatus.scheduled,
        patient_id=payload.patient_id,
        doctor_id=doctor.id,
    )
    db.add(appointment)
    db.commit()

    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
        )
        .filter(Appointment.id == appointment.id)
        .first()
    )
    return _serialize_appointment(appointment)


def _sync_prescriptions(
    db: Session,
    appointment: Appointment,
    prescriptions: list,
) -> None:
    for existing in list(appointment.prescriptions):
        db.delete(existing)

    for item in prescriptions:
        if not item.medication.strip():
            continue
        db.add(
            Prescription(
                appointment_id=appointment.id,
                medication=item.medication,
                dosage=item.dosage,
                frequency=item.duration,
            )
        )


@router.patch("/{appointment_id}")
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdateIn,
    db: Session = Depends(get_db),
):
    appointment = (
        db.query(Appointment)
        .options(joinedload(Appointment.prescriptions))
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Приём не найден")

    if payload.complaints is not None:
        appointment.complaint = payload.complaints

    if payload.objective_status is not None:
        appointment.objective_status = payload.objective_status

    if payload.diagnoses is not None:
        if payload.diagnoses:
            primary = payload.diagnoses[0]
            appointment.diagnosis_code = primary.code or None
            appointment.diagnosis_name = primary.name or None
        else:
            appointment.diagnosis_code = None
            appointment.diagnosis_name = None

    if payload.prescriptions is not None:
        _sync_prescriptions(db, appointment, payload.prescriptions)

    if payload.status is not None:
        if payload.status == AppointmentStatus.in_progress:
            db.query(Appointment).filter(
                Appointment.doctor_id == appointment.doctor_id,
                Appointment.date == appointment.date,
                Appointment.status == AppointmentStatus.in_progress,
                Appointment.id != appointment.id,
            ).update(
                {Appointment.status: AppointmentStatus.scheduled},
                synchronize_session=False,
            )
        appointment.status = payload.status
        if payload.status == AppointmentStatus.completed and appointment.duration_minutes is None:
            appointment.duration_minutes = payload.duration_minutes or 18

    if payload.duration_minutes is not None:
        appointment.duration_minutes = payload.duration_minutes

    db.commit()

    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )
    return _serialize_appointment(appointment)
