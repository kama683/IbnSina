from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.schedule import Schedule
from app.schemas.doctor import DoctorProfileUpdateIn

router = APIRouter()

EDUCATION_DATA = [
    {
        "year": "2008",
        "title": "АО «Медицинский университет Астана»",
        "description": "Специальность: Общая медицина, диплом с отличием",
    },
    {
        "year": "2010",
        "title": "Клиническая ординатура — Эндокринология",
        "description": "НАО «Казахский национальный медицинский университет»",
    },
    {
        "year": "2018",
        "title": "Повышение квалификации — Диабетология",
        "description": "Удостоверение КМО, 144 часа",
    },
    {
        "year": "2023",
        "title": "Повышение квалификации — Цифровое здравоохранение",
        "description": "Дистанционный курс, 72 часа",
    },
]

# Поля сертификата пока не в БД — отдаём статику как в mock-data
CERTIFICATE_NUMBER = "№ СС-2022-00418"
CERTIFICATE_VALID_UNTIL = "15.09.2027"


def _get_doctor_or_404(db: Session) -> Doctor:
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.schedules))
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Врач не найден")
    return doctor


def _build_badges(doctor: Doctor) -> list[dict]:
    badges: list[dict] = []
    if doctor.qualification_category:
        badges.append(
            {
                "label": "Высшая категория"
                if doctor.qualification_category == "Высшая"
                else f"{doctor.qualification_category} категория",
                "variant": "green",
            }
        )
    badges.append({"label": "КМО активен", "variant": "blue"})
    return badges


def _build_metrics(db: Session, doctor: Doctor) -> dict:
    today = date.today()
    month_start = today.replace(day=1)

    patients_in_area = (
        db.query(Patient).filter(Patient.area == doctor.area).count()
    )
    dispensary_count = (
        db.query(Patient)
        .filter(Patient.area == doctor.area, Patient.dispensary.is_(True))
        .count()
    )
    appointments_in_month = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.date >= month_start,
            Appointment.date <= today,
        )
        .count()
    )

    return {
        "patientsInArea": patients_in_area,
        "appointmentsInMay": appointments_in_month,
        "dispensary": dispensary_count,
        "experienceYears": doctor.experience_years or 0,
    }


def _serialize_schedule(doctor: Doctor) -> list[dict]:
    return [
        {
            "id": row.day_id,
            "label": row.label,
            "enabled": row.enabled,
            "start": row.start,
            "end": row.end,
        }
        for row in sorted(doctor.schedules, key=lambda item: item.id)
    ]


def _serialize_profile(db: Session, doctor: Doctor) -> dict:
    return {
        "id": doctor.id,
        "fullName": doctor.full_name,
        "firstNamePatronymic": doctor.first_name_patronymic,
        "shortName": doctor.short_name,
        "initials": doctor.initials,
        "role": doctor.role,
        "area": doctor.area,
        "title": doctor.title or doctor.role,
        "office": doctor.office or "",
        "badges": _build_badges(doctor),
        "contacts": {
            "phone": doctor.phone or "",
            "email": doctor.email or "",
            "workplace": doctor.workplace or "",
        },
        "metrics": _build_metrics(db, doctor),
        "professional": {
            "specialty": doctor.specialty or "",
            "qualificationCategory": doctor.qualification_category or "",
            "licenseNumber": doctor.license_number or "",
            "licenseValidUntil": doctor.license_valid_until or "",
            "certificateNumber": CERTIFICATE_NUMBER,
            "certificateValidUntil": CERTIFICATE_VALID_UNTIL,
            "about": doctor.about or "",
        },
        "schedule": _serialize_schedule(doctor),
        "education": EDUCATION_DATA,
    }


def _sync_schedules(db: Session, doctor: Doctor, schedule: list) -> None:
    by_day_id = {row.day_id: row for row in doctor.schedules}

    for item in schedule:
        row = by_day_id.get(item.id)
        if row is None:
            continue
        row.enabled = item.enabled
        row.start = item.start
        row.end = item.end


@router.get("/me")
def get_current_doctor(db: Session = Depends(get_db)):
    doctor = _get_doctor_or_404(db)
    return {
        "id": doctor.id,
        "fullName": doctor.full_name,
        "firstNamePatronymic": doctor.first_name_patronymic,
        "shortName": doctor.short_name,
        "initials": doctor.initials,
        "role": doctor.role,
        "area": doctor.area,
    }


@router.get("/me/profile")
def get_doctor_profile(db: Session = Depends(get_db)):
    doctor = _get_doctor_or_404(db)
    return _serialize_profile(db, doctor)


@router.patch("/me")
def update_doctor_profile(
    payload: DoctorProfileUpdateIn,
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db)

    if payload.about is not None:
        doctor.about = payload.about
    if payload.phone is not None:
        doctor.phone = payload.phone
    if payload.email is not None:
        doctor.email = payload.email
    if payload.schedule is not None:
        _sync_schedules(db, doctor, payload.schedule)

    db.commit()
    db.refresh(doctor)
    doctor = _get_doctor_or_404(db)
    return _serialize_profile(db, doctor)
