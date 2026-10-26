"""Этап 2, коммит 6: RefundRequest.

Сценарии: неодобренный возврат не создаёт Payment, approve создаёт
отрицательный Payment и меняет статус счёта, частичный возврат разрешён,
но не сверх суммы исходного платежа, reject не создаёт Payment.
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
        full_name=f"Тест Возврат {email}",
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
        full_name="Пациент Возвратный Тестович",
        short_name="Пациент В.",
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


def _make_paid_invoice_and_payment(client, headers, *, patient_id: int, service_id: int, price: int):
    created = client.post(
        "/api/invoices",
        headers=headers,
        json={"patientId": patient_id, "items": [{"serviceId": service_id, "quantity": 1}]},
    )
    invoice_id = created.json()["id"]
    client.post(f"/api/invoices/{invoice_id}/issue", headers=headers)
    payment = client.post(
        f"/api/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": price, "method": "card"},
    )
    return invoice_id, payment.json()["id"]


def test_refund_approve_creates_negative_payment_and_updates_invoice(client, db_session):
    reception = _make_employee(db_session, email="refund-reception@test.local", role=EmployeeRole.reception)
    head_doctor = _make_employee(db_session, email="refund-head@test.local", role=EmployeeRole.head_doctor)
    patient_id = _make_patient(db_session, iin="900101700101")
    service_id = _make_service(db_session, code="REF-SVC-1", price=400000)

    reception_headers = _login(client, "refund-reception@test.local")
    head_headers = _login(client, "refund-head@test.local")
    invoice_id, payment_id = _make_paid_invoice_and_payment(
        client, reception_headers, patient_id=patient_id, service_id=service_id, price=400000
    )

    requested = client.post(
        "/api/refund-requests",
        headers=reception_headers,
        json={"paymentId": payment_id, "amount": 400000, "reason": "Пациент отказался"},
    )
    assert requested.status_code == 200, requested.text
    request_id = requested.json()["id"]
    assert requested.json()["status"] == "pending"

    # До одобрения статус счёта не должен был поменяться.
    invoice_before = client.get(f"/api/invoices/{invoice_id}", headers=reception_headers)
    assert invoice_before.json()["status"] == "paid"

    approved = client.post(f"/api/refund-requests/{request_id}/approve", headers=head_headers)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    assert approved.json()["resultingPaymentId"] is not None

    invoice_after = client.get(f"/api/invoices/{invoice_id}", headers=reception_headers)
    assert invoice_after.json()["status"] == "refunded"

    payments = client.get(f"/api/invoices/{invoice_id}/payments", headers=reception_headers)
    amounts = [p["amount"] for p in payments.json()]
    assert -400000 in amounts


def test_partial_refund_leaves_invoice_partial_not_refunded(client, db_session):
    """Этап 2, коммит 14 (добор) — частичный возврат освобождает часть
    баланса счёта (§7 плана, "возврат освобождает баланс счёта"), но не
    переводит счёт в refunded целиком, в отличие от полного возврата,
    покрытого test_refund_approve_creates_negative_payment_and_updates_invoice."""
    reception = _make_employee(db_session, email="partial-refund-reception@test.local", role=EmployeeRole.reception)
    head_doctor = _make_employee(db_session, email="partial-refund-head@test.local", role=EmployeeRole.head_doctor)
    patient_id = _make_patient(db_session, iin="900101700105")
    service_id = _make_service(db_session, code="REF-SVC-5", price=500000)

    reception_headers = _login(client, "partial-refund-reception@test.local")
    head_headers = _login(client, "partial-refund-head@test.local")
    invoice_id, payment_id = _make_paid_invoice_and_payment(
        client, reception_headers, patient_id=patient_id, service_id=service_id, price=500000
    )

    requested = client.post(
        "/api/refund-requests",
        headers=reception_headers,
        json={"paymentId": payment_id, "amount": 200000, "reason": "Частичный возврат"},
    )
    assert requested.status_code == 200, requested.text
    request_id = requested.json()["id"]

    approved = client.post(f"/api/refund-requests/{request_id}/approve", headers=head_headers)
    assert approved.status_code == 200, approved.text

    invoice_after = client.get(f"/api/invoices/{invoice_id}", headers=reception_headers)
    body = invoice_after.json()
    assert body["status"] == "partial"

    payments = client.get(f"/api/invoices/{invoice_id}/payments", headers=reception_headers)
    net_paid = sum(p["amount"] for p in payments.json())
    assert net_paid == 300000


def test_reception_cannot_approve_own_refund_request(client, db_session):
    reception = _make_employee(db_session, email="refund-reception-2@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101700102")
    service_id = _make_service(db_session, code="REF-SVC-2", price=100000)

    headers = _login(client, "refund-reception-2@test.local")
    invoice_id, payment_id = _make_paid_invoice_and_payment(
        client, headers, patient_id=patient_id, service_id=service_id, price=100000
    )
    requested = client.post(
        "/api/refund-requests",
        headers=headers,
        json={"paymentId": payment_id, "amount": 100000, "reason": "Ошибка"},
    )
    request_id = requested.json()["id"]

    forbidden = client.post(f"/api/refund-requests/{request_id}/approve", headers=headers)
    assert forbidden.status_code == 403


def test_reject_does_not_create_payment(client, db_session):
    reception = _make_employee(db_session, email="refund-reception-3@test.local", role=EmployeeRole.reception)
    head_doctor = _make_employee(db_session, email="refund-head-2@test.local", role=EmployeeRole.head_doctor)
    patient_id = _make_patient(db_session, iin="900101700103")
    service_id = _make_service(db_session, code="REF-SVC-3", price=100000)

    reception_headers = _login(client, "refund-reception-3@test.local")
    head_headers = _login(client, "refund-head-2@test.local")
    invoice_id, payment_id = _make_paid_invoice_and_payment(
        client, reception_headers, patient_id=patient_id, service_id=service_id, price=100000
    )
    requested = client.post(
        "/api/refund-requests",
        headers=reception_headers,
        json={"paymentId": payment_id, "amount": 100000, "reason": "Передумал"},
    )
    request_id = requested.json()["id"]

    rejected = client.post(f"/api/refund-requests/{request_id}/reject", headers=head_headers)
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["resultingPaymentId"] is None

    invoice_after = client.get(f"/api/invoices/{invoice_id}", headers=reception_headers)
    assert invoice_after.json()["status"] == "paid", "статус счёта не должен был измениться"


def test_partial_refund_capped_at_original_payment_amount(client, db_session):
    reception = _make_employee(db_session, email="refund-reception-4@test.local", role=EmployeeRole.reception)
    head_doctor = _make_employee(db_session, email="refund-head-3@test.local", role=EmployeeRole.head_doctor)
    patient_id = _make_patient(db_session, iin="900101700104")
    service_id = _make_service(db_session, code="REF-SVC-4", price=200000)

    reception_headers = _login(client, "refund-reception-4@test.local")
    head_headers = _login(client, "refund-head-3@test.local")
    invoice_id, payment_id = _make_paid_invoice_and_payment(
        client, reception_headers, patient_id=patient_id, service_id=service_id, price=200000
    )

    first_request = client.post(
        "/api/refund-requests",
        headers=reception_headers,
        json={"paymentId": payment_id, "amount": 150000, "reason": "Частично"},
    )
    client.post(
        f"/api/refund-requests/{first_request.json()['id']}/approve", headers=head_headers
    )

    second_request = client.post(
        "/api/refund-requests",
        headers=reception_headers,
        json={"paymentId": payment_id, "amount": 100000, "reason": "Ещё раз"},
    )
    assert second_request.status_code == 400, "150000 + 100000 > исходных 200000"
