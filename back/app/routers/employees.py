from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_employee as _auth_current_employee
from app.deps import require_roles
from app.models.appointment import Appointment
from app.models.doctor_profile import DoctorProfile
from app.models.employee import Employee, EmployeeRole, EmployeeStatus
from app.models.patient import Patient
from app.schemas.doctor import DoctorProfileUpdateIn
from app.services.audit import record_audit

router = APIRouter()

# Этап 1, коммит 2 (docs/PHASE1_ANALYSIS.md §6, решение A) — список врачей
# для формы записи. head_doctor тоже ведёт приём и обязан попадать в список,
# поэтому фильтр ниже не по строгому role == doctor, а по "есть
# doctor_profile" — название query-параметра role=doctor описывает смысл
# запроса ("дай клиницистов"), а не точное сравнение с колонкой.
_VIEW_DOCTOR_LIST = require_roles(
    EmployeeRole.reception, EmployeeRole.doctor, EmployeeRole.head_doctor
)


def _with_relations(db: Session, employee_id: int) -> Employee:
    """Догружает doctor_profile/education/schedules — get_current_employee (app.deps)
    отдаёт «голый» Employee без этих связей, тут они нужны для сериализации."""
    employee = (
        db.query(Employee)
        .options(
            joinedload(Employee.doctor_profile).joinedload(DoctorProfile.education_entries),
            joinedload(Employee.schedules),
        )
        .filter(Employee.id == employee_id)
        .first()
    )
    if employee is None:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    return employee


def _build_badges(profile: DoctorProfile) -> list[dict]:
    badges: list[dict] = []
    if profile.qualification_category:
        badges.append(
            {
                "label": "Высшая категория"
                if profile.qualification_category == "Высшая"
                else f"{profile.qualification_category} категория",
                "variant": "green",
            }
        )
    badges.append({"label": "КМО активен", "variant": "blue"})
    return badges


def _build_metrics(db: Session, employee: Employee, profile: DoctorProfile) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    area = profile.area

    patients_in_area = (
        db.query(Patient).filter(Patient.area == area).count() if area else 0
    )
    dispensary_count = (
        db.query(Patient)
        .filter(Patient.area == area, Patient.dispensary.is_(True))
        .count()
        if area
        else 0
    )
    appointments_in_month = (
        db.query(Appointment)
        .filter(
            Appointment.employee_id == employee.id,
            Appointment.date >= month_start,
            Appointment.date <= today,
        )
        .count()
    )

    return {
        "patientsInArea": patients_in_area,
        "appointmentsInMay": appointments_in_month,
        "dispensary": dispensary_count,
        "experienceYears": profile.experience_years or 0,
    }


def _serialize_schedule(employee: Employee) -> list[dict]:
    return [
        {
            "id": row.day_id,
            "label": row.label,
            "enabled": row.enabled,
            "start": row.start,
            "end": row.end,
        }
        for row in sorted(employee.schedules, key=lambda item: item.id)
    ]


def _serialize_education(profile: DoctorProfile) -> list[dict]:
    return [
        {"year": row.year, "title": row.title, "description": row.description}
        for row in sorted(profile.education_entries, key=lambda item: item.year)
    ]


def _sync_schedules(employee: Employee, schedule: list) -> None:
    by_day_id = {row.day_id: row for row in employee.schedules}
    for item in schedule:
        row = by_day_id.get(item.id)
        if row is None:
            continue
        row.enabled = item.enabled
        row.start = item.start
        row.end = item.end


def serialize_employee_me(employee: Employee) -> dict:
    return {
        "id": employee.id,
        "fullName": employee.full_name,
        "firstNamePatronymic": employee.first_name_patronymic,
        "shortName": employee.short_name,
        "initials": employee.initials,
        "role": employee.role.value,
        "positionTitle": employee.position_title or "",
        "status": employee.status.value,
    }


def serialize_doctor_profile(db: Session, employee: Employee) -> dict:
    profile = employee.doctor_profile
    if profile is None:
        raise HTTPException(status_code=404, detail="Профиль врача не найден")

    return {
        "id": employee.id,
        "fullName": employee.full_name,
        "firstNamePatronymic": employee.first_name_patronymic,
        "shortName": employee.short_name,
        "initials": employee.initials,
        "positionTitle": employee.position_title or "",
        "area": profile.area or "",
        "office": profile.office or "",
        "badges": _build_badges(profile),
        "contacts": {
            "phone": employee.phone or "",
            "email": employee.email or "",
            "workplace": profile.workplace or "",
        },
        "metrics": _build_metrics(db, employee, profile),
        "professional": {
            "specialty": profile.specialty or "",
            "qualificationCategory": profile.qualification_category or "",
            "licenseNumber": profile.license_number or "",
            "licenseValidUntil": profile.license_valid_until or "",
            "certificateNumber": profile.certificate_number or "",
            "certificateValidUntil": profile.certificate_valid_until or "",
            "about": profile.about or "",
        },
        "schedule": _serialize_schedule(employee),
        "education": _serialize_education(profile),
    }


def serialize_employee_list_item(employee: Employee) -> dict:
    profile = employee.doctor_profile
    return {
        "id": employee.id,
        "shortName": employee.short_name,
        "area": (profile.area if profile else None) or "",
        "specialty": (profile.specialty if profile else None) or "",
    }


@router.get("", dependencies=[Depends(_VIEW_DOCTOR_LIST)])
def list_employees(
    role: str = Query(..., description="Пока поддерживается только 'doctor'"),
    db: Session = Depends(get_db),
):
    if role != "doctor":
        raise HTTPException(status_code=400, detail="Поддерживается только role=doctor")

    employees = (
        db.query(Employee)
        .join(DoctorProfile, DoctorProfile.employee_id == Employee.id)
        .options(joinedload(Employee.doctor_profile))
        .filter(Employee.status == EmployeeStatus.active)
        .order_by(Employee.short_name)
        .all()
    )
    return [serialize_employee_list_item(employee) for employee in employees]


@router.get("/me")
def get_my_employee(
    db: Session = Depends(get_db), current_employee: Employee = Depends(_auth_current_employee)
):
    employee = _with_relations(db, current_employee.id)
    return serialize_employee_me(employee)


@router.get("/me/profile")
def get_my_employee_profile(
    db: Session = Depends(get_db), current_employee: Employee = Depends(_auth_current_employee)
):
    employee = _with_relations(db, current_employee.id)
    return serialize_doctor_profile(db, employee)


def apply_profile_update(
    db: Session,
    employee: Employee,
    payload: DoctorProfileUpdateIn,
    request: Request | None = None,
) -> None:
    """Общая логика PATCH /me — используется и канонiчным роутером, и
    deprecated-алиасом doctors.py, чтобы аудит-запись не задваивалась и не
    расходилась между двумя копиями. Коммитит сама (audit-запись и мутация
    должны попасть в одну транзакцию)."""
    if employee.doctor_profile is None:
        raise HTTPException(status_code=404, detail="Профиль врача не найден")

    if payload.about is not None:
        employee.doctor_profile.about = payload.about
    if payload.phone is not None:
        employee.phone = payload.phone
    if payload.email is not None:
        employee.email = payload.email
    if payload.schedule is not None:
        _sync_schedules(employee, payload.schedule)

    changes = payload.model_dump(exclude_none=True)
    if changes:
        record_audit(
            db,
            actor_user_id=employee.user.id if employee.user else None,
            entity_type="employee",
            entity_id=employee.id,
            action="update_profile",
            changes=changes,
            request=request,
        )

    db.commit()


@router.patch("/me")
def update_my_employee_profile(
    payload: DoctorProfileUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(_auth_current_employee),
):
    employee = _with_relations(db, current_employee.id)
    apply_profile_update(db, employee, payload, request)

    employee = _with_relations(db, current_employee.id)
    return serialize_doctor_profile(db, employee)
