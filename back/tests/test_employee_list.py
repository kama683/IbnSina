"""Этап 1, коммит 2: GET /api/employees?role=doctor.

Проверяем то, что параметризованная матрица не покрывает: форму ответа
(нет кадровой PII — телефон/email/зарплата), что уволенные не попадают в
список, и что head_doctor (у него тоже есть doctor_profile) туда попадает —
это и есть решение A из docs/PHASE1_ANALYSIS.md §6.1.
"""
from datetime import date

from app.models.doctor_profile import DoctorProfile
from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.user import User
from app.security import hash_password


def _make_doctor(db_session, *, email: str, role: EmployeeRole, status: EmployeeStatus) -> Employee:
    employee = Employee(
        full_name=f"Тест Докторов {email}",
        first_name_patronymic="Тест Тестович",
        short_name=f"Т. {email}",
        initials="ТТ",
        role=role,
        hired_at=date.today(),
        status=status,
        salary_type=SalaryType.fixed,
        phone="+77770000000",
        email=email,
    )
    db_session.add(employee)
    db_session.flush()
    db_session.add(
        DoctorProfile(employee_id=employee.id, specialty="Терапевт")
    )
    db_session.add(
        User(
            email=email,
            full_name=employee.full_name,
            password_hash=hash_password("test-pass-123"),
            employee_id=employee.id,
        )
    )
    db_session.commit()
    return employee


def _login(client, email: str) -> dict[str, str]:
    response = client.post(
        "/api/auth/login", json={"email": email, "password": "test-pass-123"}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def test_employee_list_excludes_fired_and_includes_head_doctor(client, db_session):
    active_doctor = _make_doctor(
        db_session,
        email="list-active@test.local",
        role=EmployeeRole.doctor,
        status=EmployeeStatus.active,
    )
    fired_doctor = _make_doctor(
        db_session,
        email="list-fired@test.local",
        role=EmployeeRole.doctor,
        status=EmployeeStatus.fired,
    )
    head_doctor = _make_doctor(
        db_session,
        email="list-head@test.local",
        role=EmployeeRole.head_doctor,
        status=EmployeeStatus.active,
    )

    headers = _login(client, "list-active@test.local")
    response = client.get("/api/employees?role=doctor", headers=headers)
    assert response.status_code == 200, response.text

    body = response.json()
    ids = {item["id"] for item in body}
    assert active_doctor.id in ids
    assert head_doctor.id in ids, "head_doctor должен попадать в список — решение A"
    assert fired_doctor.id not in ids, "уволенный не должен попадать в список"

    item = next(item for item in body if item["id"] == active_doctor.id)
    assert set(item.keys()) == {"id", "shortName", "specialty"}, (
        "в ответе не должно быть кадровой PII (phone/email/salary/...)"
    )


def test_employee_list_rejects_unknown_role_value(client, db_session):
    doctor = _make_doctor(
        db_session,
        email="list-unknown-role@test.local",
        role=EmployeeRole.doctor,
        status=EmployeeStatus.active,
    )
    headers = _login(client, "list-unknown-role@test.local")
    response = client.get("/api/employees?role=nurse", headers=headers)
    assert response.status_code == 400
