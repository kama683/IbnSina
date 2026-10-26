"""Этап 2, коммит 4: Payment.

Сценарии: cash требует открытой смены, овердрафт отклоняется 409,
последовательные частичные оплаты доводят счёт до paid, append-only
(маршрутов PATCH/DELETE физически нет).
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
        full_name=f"Тест Оплата {email}",
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
        full_name="Пациент Платёжный Тестович",
        short_name="Пациент П.",
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


def _make_unpaid_invoice(client, headers, *, patient_id: int, service_id: int, price: int) -> str:
    created = client.post(
        "/api/invoices",
        headers=headers,
        json={"patientId": patient_id, "items": [{"serviceId": service_id, "quantity": 1}]},
    )
    invoice_id = created.json()["id"]
    issued = client.post(f"/api/invoices/{invoice_id}/issue", headers=headers)
    assert issued.status_code == 200, issued.text
    return invoice_id


def test_cash_payment_requires_open_shift(client, db_session):
    reception = _make_employee(db_session, email="pay-reception@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101500101")
    service_id = _make_service(db_session, code="PAY-SVC-1", price=300000)

    headers = _login(client, "pay-reception@test.local")
    invoice_id = _make_unpaid_invoice(client, headers, patient_id=patient_id, service_id=service_id, price=300000)

    no_shift = client.post(
        f"/api/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 300000, "method": "cash"},
    )
    assert no_shift.status_code == 409

    client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 0})
    ok = client.post(
        f"/api/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 300000, "method": "cash"},
    )
    assert ok.status_code == 200, ok.text


def test_card_payment_does_not_require_shift(client, db_session):
    reception = _make_employee(db_session, email="pay-reception-2@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101500102")
    service_id = _make_service(db_session, code="PAY-SVC-2", price=300000)

    headers = _login(client, "pay-reception-2@test.local")
    invoice_id = _make_unpaid_invoice(client, headers, patient_id=patient_id, service_id=service_id, price=300000)

    ok = client.post(
        f"/api/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 300000, "method": "card"},
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["cashShiftId"] is None


def test_overdraft_rejected(client, db_session):
    reception = _make_employee(db_session, email="pay-reception-3@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101500103")
    service_id = _make_service(db_session, code="PAY-SVC-3", price=100000)

    headers = _login(client, "pay-reception-3@test.local")
    invoice_id = _make_unpaid_invoice(client, headers, patient_id=patient_id, service_id=service_id, price=100000)

    overpay = client.post(
        f"/api/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 150000, "method": "card"},
    )
    assert overpay.status_code == 409


def test_sequential_partial_payments_reach_paid_status(client, db_session):
    reception = _make_employee(db_session, email="pay-reception-4@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101500104")
    service_id = _make_service(db_session, code="PAY-SVC-4", price=200000)

    headers = _login(client, "pay-reception-4@test.local")
    invoice_id = _make_unpaid_invoice(client, headers, patient_id=patient_id, service_id=service_id, price=200000)

    first = client.post(
        f"/api/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 100000, "method": "card"},
    )
    assert first.status_code == 200

    invoice_after_first = client.get(f"/api/invoices/{invoice_id}", headers=headers)
    assert invoice_after_first.json()["status"] == "partial"

    second = client.post(
        f"/api/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 100000, "method": "cash"},
    )
    assert second.status_code == 409, "нет открытой смены для налички"

    client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 0})
    second_retry = client.post(
        f"/api/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 100000, "method": "cash"},
    )
    assert second_retry.status_code == 200, second_retry.text

    invoice_after_second = client.get(f"/api/invoices/{invoice_id}", headers=headers)
    assert invoice_after_second.json()["status"] == "paid"
