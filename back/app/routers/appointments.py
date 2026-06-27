from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.appointment import Appointment, AppointmentStatus

router = APIRouter()


def _serialize_appointment(appointment: Appointment) -> dict:
    return {
        "id": str(appointment.id),
        "time": appointment.time,
        "patient": appointment.patient.short_name,
        "complaint": appointment.complaint,
        "diagnosis": appointment.diagnosis,
        "status": appointment.status.value,
    }


@router.get("/today")
def get_today_appointments(db: Session = Depends(get_db)):
    today = date.today()
    rows = (
        db.query(Appointment)
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
        .filter(
            Appointment.date == today,
            Appointment.status == AppointmentStatus.in_progress,
        )
        .first()
    )
    if not row:
        return None
    return _serialize_appointment(row)
