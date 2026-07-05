from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.prescription import Prescription
from app.schemas.appointment import AppointmentUpdateIn

router = APIRouter()


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
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=5)
    rows = _query_appointments(db, week_start, week_end)
    return [_serialize_appointment(row) for row in rows]


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
        appointment.status = payload.status

    db.commit()

    appointment = (
        db.query(Appointment)
        .options(joinedload(Appointment.prescriptions))
        .filter(Appointment.id == appointment_id)
        .first()
    )
    return _serialize_examination(appointment)


def _serialize_examination(appointment: Appointment) -> dict:
    diagnoses = []
    if appointment.diagnosis_code:
        diagnoses.append(
            {
                "code": appointment.diagnosis_code,
                "name": appointment.diagnosis_name or "",
            }
        )

    prescriptions = [
        {
            "id": str(prescription.id),
            "medication": prescription.medication,
            "dosage": prescription.dosage,
            "duration": prescription.frequency,
        }
        for prescription in appointment.prescriptions
    ]
    if not prescriptions:
        prescriptions = [
            {"id": "new", "medication": "", "dosage": "", "duration": ""}
        ]

    return {
        "patientId": str(appointment.patient_id),
        "appointmentId": str(appointment.id),
        "status": appointment.status.value,
        "complaints": appointment.complaint,
        "objectiveStatus": appointment.objective_status or "",
        "diagnoses": diagnoses,
        "prescriptions": prescriptions,
    }
