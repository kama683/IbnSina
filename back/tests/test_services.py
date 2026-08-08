"""Этап 2, коммит 1: прейскурант.

Матрица прав (кто читает/пишет) + сценарии: код уникален, is_active=false
не удаляет строку, accountant не видит прейскурант вообще (решение A,
docs/PHASE2_ANALYSIS.md §6).
"""
from datetime import date

from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.user import User
from app.security import hash_password

_PASSWORD = "test-pass-123"


def _make_employee(db_session, *, email: str, role: EmployeeRole) -> Employee:
    employee = Employee(
        full_name=f"Тест Услуги {email}",
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


def test_head_doctor_creates_service_and_reception_sees_it(client, db_session):
    head_doctor = _make_employee(db_session, email="svc-head@test.local", role=EmployeeRole.head_doctor)
    reception = _make_employee(db_session, email="svc-reception@test.local", role=EmployeeRole.reception)

    head_headers = _login(client, "svc-head@test.local")
    create = client.post(
        "/api/services",
        headers=head_headers,
        json={"code": "CONS-001", "name": "Приём терапевта", "category": "consultation", "price": 500000},
    )
    assert create.status_code == 200, create.text
    service_id = create.json()["id"]

    reception_headers = _login(client, "svc-reception@test.local")
    listing = client.get("/api/services", headers=reception_headers)
    assert listing.status_code == 200
    assert any(item["id"] == service_id for item in listing.json())


def test_accountant_cannot_view_services(client, db_session):
    accountant = _make_employee(db_session, email="svc-accountant@test.local", role=EmployeeRole.accountant)
    headers = _login(client, "svc-accountant@test.local")
    response = client.get("/api/services", headers=headers)
    assert response.status_code == 403


def test_reception_cannot_create_service(client, db_session):
    reception = _make_employee(db_session, email="svc-reception-2@test.local", role=EmployeeRole.reception)
    headers = _login(client, "svc-reception-2@test.local")
    response = client.post(
        "/api/services",
        headers=headers,
        json={"code": "X-001", "name": "X", "category": "other", "price": 100},
    )
    assert response.status_code == 403


def test_duplicate_code_rejected(client, db_session):
    head_doctor = _make_employee(db_session, email="svc-head-2@test.local", role=EmployeeRole.head_doctor)
    headers = _login(client, "svc-head-2@test.local")
    payload = {"code": "DUP-001", "name": "Услуга 1", "category": "procedure", "price": 100000}
    first = client.post("/api/services", headers=headers, json=payload)
    assert first.status_code == 200
    second = client.post(
        "/api/services",
        headers=headers,
        json={**payload, "name": "Другое название"},
    )
    assert second.status_code == 409


def test_deactivate_hides_from_default_list_but_keeps_row(client, db_session):
    head_doctor = _make_employee(db_session, email="svc-head-3@test.local", role=EmployeeRole.head_doctor)
    headers = _login(client, "svc-head-3@test.local")
    create = client.post(
        "/api/services",
        headers=headers,
        json={"code": "DEACT-001", "name": "Снимаемая услуга", "category": "other", "price": 100000},
    )
    service_id = create.json()["id"]

    deactivate = client.patch(
        f"/api/services/{service_id}", headers=headers, json={"isActive": False}
    )
    assert deactivate.status_code == 200
    assert deactivate.json()["isActive"] is False

    default_list = client.get("/api/services", headers=headers)
    assert not any(item["id"] == service_id for item in default_list.json())

    with_inactive = client.get("/api/services?includeInactive=true", headers=headers)
    assert any(item["id"] == service_id for item in with_inactive.json())
