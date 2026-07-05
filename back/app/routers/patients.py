from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Patient
from app.models.appointment import Appointment, AppointmentStatus
from app.models.health_metric import HealthMetric
from app.models.hospitalization import Hospitalization
from app.models.vaccination import Vaccination
from app.schemas.patient import PatientCreateIn

router = APIRouter()

_PATIENT_LOAD_OPTIONS = (
    joinedload(Patient.diseases),
    joinedload(Patient.allergies),
    joinedload(Patient.hospitalizations).joinedload(Hospitalization.doctor),
)


def _build_short_name(full_name: str) -> str:
    parts = full_name.split()
    if len(parts) >= 3:
        return f"{parts[0]} {parts[1][0]}.{parts[2][0]}."
    if len(parts) == 2:
        return f"{parts[0]} {parts[1][0]}."
    return full_name


def _age_label(birth_date: date) -> str:
    today = date.today()
    age = today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )
    if 11 <= age % 100 <= 14:
        word = "лет"
    elif age % 10 == 1:
        word = "год"
    elif age % 10 in (2, 3, 4):
        word = "года"
    else:
        word = "лет"
    return f"{age} {word}"


def _last_appointment_label(db: Session, patient_id: int) -> str | None:
    row = (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.date.desc(), Appointment.time.desc())
        .first()
    )
    if not row:
        return None
    return row.date.strftime("%d.%m.%Y")


def _serialize_patient(db: Session, patient: Patient) -> dict:
    hospitalization = (
        patient.hospitalizations[0] if patient.hospitalizations else None
    )
    disease_labels = [disease.label for disease in patient.diseases]

    result: dict = {
        "id": str(patient.id),
        "fullName": patient.full_name,
        "shortName": patient.short_name,
        "iin": patient.iin,
        "birthDate": patient.birth_date.strftime("%d.%m.%Y"),
        "ageLabel": _age_label(patient.birth_date),
        "gender": patient.gender,
        "bloodType": patient.blood_type or "",
        "phone": patient.phone or "",
        "address": patient.address or "",
        "area": patient.area,
        "lastAppointment": _last_appointment_label(db, patient.id),
        "dispensary": patient.dispensary,
        "careType": "inpatient" if hospitalization else "ambulatory",
        "allergies": [allergy.name for allergy in patient.allergies],
        "chronicDiseases": disease_labels,
        "diseases": [
            {"label": disease.label, "variant": disease.variant.value}
            for disease in patient.diseases
        ],
    }

    if hospitalization:
        result["inpatient"] = {
            "department": hospitalization.department,
            "ward": hospitalization.ward or "",
            "bed": hospitalization.bed or "",
            "admittedAt": hospitalization.admitted_at.strftime("%d.%m.%Y"),
            "attendingDoctor": hospitalization.doctor.short_name,
            "primaryDiagnosis": hospitalization.primary_diagnosis or "",
        }

    return result


def _serialize_history_entry(appointment: Appointment) -> dict:
    return {
        "id": str(appointment.id),
        "patientId": str(appointment.patient_id),
        "date": appointment.date.strftime("%d.%m.%Y"),
        "time": appointment.time,
        "doctor": appointment.doctor.short_name,
        "status": appointment.status.value,
        "complaint": appointment.complaint,
        "diagnosis": appointment.diagnosis,
    }


def _serialize_health_metric(metric: HealthMetric) -> dict:
    result = {
        "label": metric.label,
        "value": metric.value,
        "date": metric.date.strftime("%d.%m.%Y"),
    }
    if metric.note:
        result["note"] = metric.note
    return result


def _serialize_vaccination(vaccination: Vaccination, patient_id: int) -> dict:
    # В БД препарат и серия хранятся в одном поле dose — разбиваем для фронта
    drug = vaccination.dose or ""
    series = ""
    if ", серия " in drug:
        drug, series = drug.split(", серия ", 1)

    return {
        "id": str(vaccination.id),
        "patientId": str(patient_id),
        "date": vaccination.date.strftime("%d.%m.%Y"),
        "name": vaccination.name,
        "drug": drug,
        "series": series,
        "notes": vaccination.notes,
    }


def _get_patient_or_404(db: Session, patient_id: int) -> Patient:
    patient = (
        db.query(Patient)
        .options(*_PATIENT_LOAD_OPTIONS)
        .filter(Patient.id == patient_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")
    return patient


def _find_active_appointment(db: Session, patient_id: int) -> Appointment | None:
    in_progress = (
        db.query(Appointment)
        .options(joinedload(Appointment.prescriptions))
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.status == AppointmentStatus.in_progress,
        )
        .order_by(Appointment.date.desc(), Appointment.time.desc())
        .first()
    )
    if in_progress:
        return in_progress

    today = date.today()
    return (
        db.query(Appointment)
        .options(joinedload(Appointment.prescriptions))
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.date == today,
            Appointment.status == AppointmentStatus.scheduled,
        )
        .order_by(Appointment.time)
        .first()
    )


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


def _serialize_visit_history(appointment: Appointment) -> dict:
    diagnosis = appointment.diagnosis or "—"
    return {
        "id": str(appointment.id),
        "patientId": str(appointment.patient_id),
        "date": appointment.date.strftime("%d.%m.%Y"),
        "status": appointment.status.value,
        "summary": f"{appointment.complaint} / {diagnosis}",
    }


@router.get("")
def list_patients(
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1, le=100),
    search: str = Query(""),
    area: str = Query(""),
    db: Session = Depends(get_db),
):
    query = db.query(Patient).options(*_PATIENT_LOAD_OPTIONS)

    normalized_search = search.strip().lower()
    if normalized_search:
        query = query.filter(
            Patient.full_name.ilike(f"%{normalized_search}%")
            | Patient.iin.ilike(f"%{normalized_search.replace(' ', '')}%")
        )

    if area and area != "all":
        query = query.filter(Patient.area == area)

    total = query.count()
    patients = (
        query.order_by(Patient.full_name)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    areas = [
        row[0]
        for row in db.query(Patient.area).distinct().order_by(Patient.area).all()
    ]

    return {
        "items": [_serialize_patient(db, patient) for patient in patients],
        "total": total,
        "page": page,
        "limit": limit,
        "areas": areas,
    }


@router.post("")
def create_patient(payload: PatientCreateIn, db: Session = Depends(get_db)):
    existing = db.query(Patient).filter(Patient.iin == payload.iin).first()
    if existing:
        raise HTTPException(status_code=409, detail="Пациент с таким ИИН уже существует")

    patient = Patient(
        full_name=payload.full_name,
        short_name=_build_short_name(payload.full_name),
        iin=payload.iin,
        birth_date=payload.birth_date,
        gender=payload.gender,
        phone=payload.phone,
        address=payload.address,
        area=payload.area,
        blood_type=payload.blood_type,
        dispensary=payload.dispensary,
    )
    db.add(patient)
    db.commit()

    patient = _get_patient_or_404(db, patient.id)
    return _serialize_patient(db, patient)


@router.get("/{patient_id}/history")
def get_patient_history(patient_id: int, db: Session = Depends(get_db)):
    _get_patient_or_404(db, patient_id)
    rows = (
        db.query(Appointment)
        .options(joinedload(Appointment.doctor))
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.date.desc(), Appointment.time.desc())
        .all()
    )
    return [_serialize_history_entry(row) for row in rows]


@router.get("/{patient_id}/health-metrics")
def get_patient_health_metrics(patient_id: int, db: Session = Depends(get_db)):
    _get_patient_or_404(db, patient_id)
    rows = (
        db.query(HealthMetric)
        .filter(HealthMetric.patient_id == patient_id)
        .order_by(HealthMetric.date.desc(), HealthMetric.label)
        .all()
    )
    return [_serialize_health_metric(row) for row in rows]


@router.get("/{patient_id}/vaccinations")
def get_patient_vaccinations(patient_id: int, db: Session = Depends(get_db)):
    _get_patient_or_404(db, patient_id)
    rows = (
        db.query(Vaccination)
        .filter(Vaccination.patient_id == patient_id)
        .order_by(Vaccination.date.desc())
        .all()
    )
    return [_serialize_vaccination(row, patient_id) for row in rows]


@router.get("/{patient_id}/examination")
def get_patient_examination(patient_id: int, db: Session = Depends(get_db)):
    _get_patient_or_404(db, patient_id)
    appointment = _find_active_appointment(db, patient_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Активный приём не найден")
    return _serialize_examination(appointment)


@router.get("/{patient_id}/visit-history")
def get_patient_visit_history(patient_id: int, db: Session = Depends(get_db)):
    _get_patient_or_404(db, patient_id)
    rows = (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.date.desc(), Appointment.time.desc())
        .limit(5)
        .all()
    )
    return [_serialize_visit_history(row) for row in rows]


@router.get("/{patient_id}")
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = _get_patient_or_404(db, patient_id)
    return _serialize_patient(db, patient)
