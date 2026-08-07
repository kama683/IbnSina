"""Этап 0, коммит 12: проверка сид-данных на отсутствие NULL в FK-колонках
employee_id/doctor_profile_id — additive-then-destructive миграция
(коммиты 1-5) потенциально могла оставить незаполненные строки, план прямо
просит это перепроверить (§7, пункт 12).
"""
from sqlalchemy import text

import seed
from app.database import SessionLocal

_NOT_NULL_CHECKS = {
    "appointments.employee_id": "SELECT COUNT(*) FROM appointments WHERE employee_id IS NULL",
    "hospitalizations.employee_id": "SELECT COUNT(*) FROM hospitalizations WHERE employee_id IS NULL",
    "schedules.employee_id": "SELECT COUNT(*) FROM schedules WHERE employee_id IS NULL",
    "doctor_education.doctor_profile_id": "SELECT COUNT(*) FROM doctor_education WHERE doctor_profile_id IS NULL",
    "users.employee_id": "SELECT COUNT(*) FROM users WHERE employee_id IS NULL",
    "doctor_profiles.employee_id": "SELECT COUNT(*) FROM doctor_profiles WHERE employee_id IS NULL",
}


def test_seed_populates_no_null_employee_or_profile_fk():
    seed.seed()

    db = SessionLocal()
    try:
        for label, query in _NOT_NULL_CHECKS.items():
            count = db.execute(text(query)).scalar()
            assert count == 0, f"{label}: {count} строк с NULL"
    finally:
        db.close()


def test_seed_is_idempotent():
    seed.seed()
    db = SessionLocal()
    try:
        employees_after_first = db.execute(text("SELECT COUNT(*) FROM employees")).scalar()
        patients_after_first = db.execute(text("SELECT COUNT(*) FROM patients")).scalar()
    finally:
        db.close()

    seed.seed()
    db = SessionLocal()
    try:
        employees_after_second = db.execute(text("SELECT COUNT(*) FROM employees")).scalar()
        patients_after_second = db.execute(text("SELECT COUNT(*) FROM patients")).scalar()
    finally:
        db.close()

    assert employees_after_first == employees_after_second
    assert patients_after_first == patients_after_second


def test_seed_creates_all_six_roles():
    seed.seed()

    db = SessionLocal()
    try:
        roles = db.execute(text("SELECT DISTINCT role FROM employees ORDER BY role")).scalars().all()
    finally:
        db.close()

    assert set(roles) == {
        "reception",
        "doctor",
        "nurse",
        "accountant",
        "head_doctor",
        "admin",
    }
