"""Тонкий deprecated-алиас поверх routers/employees.py — Этап 0, коммит 4.

Сохраняет старый JSON-контракт /api/doctors/me[/profile] для уже
существующего фронтенда (он переключится на /api/employees/* в коммитах
9-10). Снимается вместе с deprecated-полем doctorId в коммите 11, см.
решение по вопросу 1 в docs/PHASE0_ANALYSIS.md.

Единственное сознательное расхождение со старым контрактом: раньше `role` и
`title` были двумя разными строками на Doctor (например "Эндокринолог" и
"Врач-эндокринолог"), у Employee для этого один слот — `position_title`.
Обе старые строки при переносе не сохранились как отдельные поля — здесь оба
ключа отдаются из одного и того же position_title.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_employee as _auth_current_employee
from app.models.employee import Employee
from app.routers.employees import apply_profile_update, _with_relations, serialize_doctor_profile
from app.schemas.doctor import DoctorProfileUpdateIn

router = APIRouter()


def _serialize_doctor_alias_me(employee: Employee) -> dict:
    profile = employee.doctor_profile
    if profile is None:
        raise HTTPException(status_code=404, detail="Врач не найден")
    return {
        "id": employee.id,
        "fullName": employee.full_name,
        "firstNamePatronymic": employee.first_name_patronymic,
        "shortName": employee.short_name,
        "initials": employee.initials,
        "role": employee.position_title or "",
        "area": profile.area or "",
        "office": profile.office or "",
    }


def _serialize_doctor_alias_profile(db: Session, employee: Employee) -> dict:
    result = serialize_doctor_profile(db, employee)
    result["role"] = employee.position_title or ""
    result["title"] = employee.position_title or ""
    return result


@router.get("/me")
def get_current_doctor(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(_auth_current_employee),
):
    employee = _with_relations(db, current_employee.id)
    return _serialize_doctor_alias_me(employee)


@router.get("/me/profile")
def get_doctor_profile(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(_auth_current_employee),
):
    employee = _with_relations(db, current_employee.id)
    return _serialize_doctor_alias_profile(db, employee)


@router.patch("/me")
def update_doctor_profile(
    payload: DoctorProfileUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(_auth_current_employee),
):
    employee = _with_relations(db, current_employee.id)
    apply_profile_update(db, employee, payload, request)

    employee = _with_relations(db, current_employee.id)
    return _serialize_doctor_alias_profile(db, employee)
