"""Этап 1, коммит 6: PATCH /api/patients/{id}.

Матрица (test_rbac_matrix.py) проверяет только допуск по роли пустым телом.
Здесь — фактическая правка полей, аудит (updated_at/updated_by_id, не
отдаётся в ответе, проверяем напрямую в БД) и конфликт по ИИН.
"""
from datetime import date

from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.patient import Patient
from app.models.user import User
from app.security import hash_password

_PASSWORD = "test-pass-123"


def _make_employee(db_session, *, email: str, role: EmployeeRole) -> Employee:
    employee = Employee(
        full_name=f"Тест Пациент {email}",
        first_name_patronymic="Тест Тестович",
        short_name=f"Т. {email}",
        initials="ТТ",
        role=role,
        hired_at=date.today(),
        status=EmployeeStatus.active,
        salary_type=SalaryType.fixed,
    )
    db_session.add(employee)
    db_session.flush()
    db_session.add(
        User(
            email=email,
            full_name=employee.full_name,
            password_hash=hash_password(_PASSWORD),
            employee_id=employee.id,
        )
    )
    db_session.commit()
    return employee


def _login(client, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": _PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def _make_patient(db_session, *, iin: str) -> Patient:
    patient = Patient(
        iin=iin,
        full_name="Пациент Тестовый Тестович",
        short_name="Пациент Т.",
        birth_date=date(1990, 1, 1),
        gender="М",
        area="Участок 1",
    )
    db_session.add(patient)
    db_session.commit()
    return patient


def test_reception_updates_patient_demographics_and_sets_audit_fields(client, db_session):
    reception = _make_employee(db_session, email="patch-reception@test.local", role=EmployeeRole.reception)
    patient = _make_patient(db_session, iin="900101300201")

    headers = _login(client, "patch-reception@test.local")
    response = client.patch(
        f"/api/patients/{patient.id}",
        headers=headers,
        json={"phone": "+77771234567", "address": "ул. Тестовая, 1"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["phone"] == "+77771234567"
    assert body["address"] == "ул. Тестовая, 1"

    db_session.refresh(patient)
    assert patient.updated_at is not None
    assert patient.updated_by_id == reception.id


def test_patient_update_rejects_duplicate_iin(client, db_session):
    reception = _make_employee(db_session, email="patch-reception-2@test.local", role=EmployeeRole.reception)
    existing = _make_patient(db_session, iin="900101300202")
    target = _make_patient(db_session, iin="900101300203")

    headers = _login(client, "patch-reception-2@test.local")
    response = client.patch(
        f"/api/patients/{target.id}",
        headers=headers,
        json={"iin": existing.iin},
    )
    assert response.status_code == 409


def test_doctor_cannot_update_patient_demographics(client, db_session):
    doctor = _make_employee(db_session, email="patch-doctor@test.local", role=EmployeeRole.doctor)
    patient = _make_patient(db_session, iin="900101300204")

    headers = _login(client, "patch-doctor@test.local")
    response = client.patch(
        f"/api/patients/{patient.id}",
        headers=headers,
        json={"phone": "+77770000000"},
    )
    assert response.status_code == 403
