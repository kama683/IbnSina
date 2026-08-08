"""Этап 2, коммит 2: кассовая смена (без отчёта — тот приезжает в коммите 5).

Сценарии: одна открытая смена на кассира (решение 3), закрытая смена не
закрывается второй раз, владение (reception — своя, head_doctor — любая).
"""
from datetime import date

from app.models.cash_shift import CashShift, CashShiftStatus
from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.user import User
from app.security import hash_password

_PASSWORD = "test-pass-123"


def _make_employee(db_session, *, email: str, role: EmployeeRole) -> Employee:
    employee = Employee(
        full_name=f"Тест Касса {email}",
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


def test_open_and_close_own_shift(client, db_session):
    reception = _make_employee(db_session, email="shift-reception@test.local", role=EmployeeRole.reception)
    headers = _login(client, "shift-reception@test.local")

    opened = client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 500000})
    assert opened.status_code == 200, opened.text
    shift_id = opened.json()["id"]
    assert opened.json()["status"] == "open"

    current = client.get("/api/cash-shifts/current", headers=headers)
    assert current.status_code == 200
    assert current.json()["id"] == shift_id

    closed = client.post(
        f"/api/cash-shifts/{shift_id}/close", headers=headers, json={"actualCash": 480000}
    )
    assert closed.status_code == 200, closed.text
    assert closed.json()["status"] == "closed"
    assert closed.json()["actualCash"] == 480000


def test_cannot_open_second_shift_while_one_is_open(client, db_session):
    reception = _make_employee(db_session, email="shift-reception-2@test.local", role=EmployeeRole.reception)
    headers = _login(client, "shift-reception-2@test.local")

    first = client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 100000})
    assert first.status_code == 200

    second = client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 100000})
    assert second.status_code == 409


def test_cannot_close_already_closed_shift(client, db_session):
    reception = _make_employee(db_session, email="shift-reception-3@test.local", role=EmployeeRole.reception)
    headers = _login(client, "shift-reception-3@test.local")

    opened = client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 0})
    shift_id = opened.json()["id"]
    client.post(f"/api/cash-shifts/{shift_id}/close", headers=headers, json={"actualCash": 0})

    second_close = client.post(
        f"/api/cash-shifts/{shift_id}/close", headers=headers, json={"actualCash": 0}
    )
    assert second_close.status_code == 409


def test_reception_cannot_close_colleague_shift_but_head_doctor_can(client, db_session):
    owner = _make_employee(db_session, email="shift-owner@test.local", role=EmployeeRole.reception)
    other = _make_employee(db_session, email="shift-other@test.local", role=EmployeeRole.reception)
    head_doctor = _make_employee(db_session, email="shift-head@test.local", role=EmployeeRole.head_doctor)

    owner_headers = _login(client, "shift-owner@test.local")
    opened = client.post("/api/cash-shifts", headers=owner_headers, json={"openingBalance": 0})
    shift_id = opened.json()["id"]

    other_headers = _login(client, "shift-other@test.local")
    forbidden = client.post(
        f"/api/cash-shifts/{shift_id}/close", headers=other_headers, json={"actualCash": 0}
    )
    assert forbidden.status_code == 403

    head_headers = _login(client, "shift-head@test.local")
    allowed = client.post(
        f"/api/cash-shifts/{shift_id}/close", headers=head_headers, json={"actualCash": 0}
    )
    assert allowed.status_code == 200, allowed.text
