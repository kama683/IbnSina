"""Этап 2, коммит 5: отчёты по смене и дневной.

Сценарии: расхождение при закрытии считается верно, дневной отчёт видит
только head_doctor, отчёт по смене — reception своя/head_doctor любая.
"""
from datetime import date

from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.patient import Patient
from app.models.service import Service, ServiceCategory
from app.models.user import User
from app.security import hash_password

_PASSWORD = "test-pass-123"


def _make_employee(db_session, *, email: str, role: EmployeeRole) -> Employee:
    employee = Employee(
        full_name=f"Тест Отчёт {email}",
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


def _make_patient(db_session, *, iin: str) -> int:
    patient = Patient(
        iin=iin,
        full_name="Пациент Отчётный Тестович",
        short_name="Пациент О.",
        birth_date=date(1990, 1, 1),
        gender="М",
    )
    db_session.add(patient)
    db_session.commit()
    return patient.id


def _make_service(db_session, *, code: str, price: int) -> int:
    service = Service(
        code=code, name=f"Услуга {code}", category=ServiceCategory.consultation, price=price
    )
    db_session.add(service)
    db_session.commit()
    return service.id


def test_shift_report_discrepancy_and_totals(client, db_session):
    reception = _make_employee(db_session, email="report-reception@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101600101")
    service_id = _make_service(db_session, code="REP-SVC-1", price=300000)

    headers = _login(client, "report-reception@test.local")
    opened = client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 100000})
    shift_id = opened.json()["id"]

    created = client.post(
        "/api/invoices",
        headers=headers,
        json={"patientId": patient_id, "items": [{"serviceId": service_id, "quantity": 1}]},
    )
    invoice_id = created.json()["id"]
    client.post(f"/api/invoices/{invoice_id}/issue", headers=headers)
    client.post(
        f"/api/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 300000, "method": "cash"},
    )

    closed = client.post(
        f"/api/cash-shifts/{shift_id}/close", headers=headers, json={"actualCash": 390000}
    )
    assert closed.status_code == 200

    report = client.get(f"/api/cash-shifts/{shift_id}/report", headers=headers)
    assert report.status_code == 200, report.text
    body = report.json()
    assert body["cashTotal"] == 300000
    assert body["expectedCash"] == 400000  # 100000 opening + 300000 cash
    assert body["discrepancy"] == -10000  # 390000 actual - 400000 expected


def test_daily_report_only_head_doctor(client, db_session):
    reception = _make_employee(db_session, email="report-reception-2@test.local", role=EmployeeRole.reception)
    head_doctor = _make_employee(db_session, email="report-head@test.local", role=EmployeeRole.head_doctor)

    reception_headers = _login(client, "report-reception-2@test.local")
    forbidden = client.get(
        f"/api/reports/daily?date={date.today().isoformat()}", headers=reception_headers
    )
    assert forbidden.status_code == 403

    head_headers = _login(client, "report-head@test.local")
    allowed = client.get(
        f"/api/reports/daily?date={date.today().isoformat()}", headers=head_headers
    )
    assert allowed.status_code == 200, allowed.text
    assert "cashTotal" in allowed.json()
