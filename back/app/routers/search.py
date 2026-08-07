from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import require_roles
from app.models.appointment import Appointment
from app.models.employee import EmployeeRole
from app.models.patient import Patient

router = APIRouter()

# "Пациент: поиск" в матрице плана — доступно всем пяти небольничным ролям.
_ANY_STAFF = require_roles(
    EmployeeRole.reception,
    EmployeeRole.doctor,
    EmployeeRole.nurse,
    EmployeeRole.accountant,
    EmployeeRole.head_doctor,
)


@router.get("", dependencies=[Depends(_ANY_STAFF)])
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    query = q.strip().lower()
    if not query:
        return {"patients": [], "appointments": []}

    patients = (
        db.query(Patient)
        .filter(
            Patient.full_name.ilike(f"%{query}%")
            | Patient.short_name.ilike(f"%{query}%")
            | Patient.iin.ilike(f"%{query.replace(' ', '')}%")
        )
        .order_by(Patient.full_name)
        .limit(5)
        .all()
    )

    appointments = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.employee),
        )
        .join(Patient, Appointment.patient_id == Patient.id)
        .filter(
            Patient.full_name.ilike(f"%{query}%")
            | Patient.short_name.ilike(f"%{query}%")
            | Appointment.complaint.ilike(f"%{query}%")
        )
        .order_by(Appointment.date.desc(), Appointment.time.desc())
        .limit(5)
        .all()
    )

    return {
        "patients": [
            {
                "id": str(patient.id),
                "fullName": patient.full_name,
                "shortName": patient.short_name,
                "iin": patient.iin,
            }
            for patient in patients
        ],
        "appointments": [
            {
                "id": str(appointment.id),
                "patientId": str(appointment.patient_id),
                "patient": appointment.patient.short_name,
                "date": appointment.date.strftime("%d.%m.%Y"),
                "time": appointment.time,
                "complaint": appointment.complaint,
                "status": appointment.status.value,
            }
            for appointment in appointments
        ],
    }
