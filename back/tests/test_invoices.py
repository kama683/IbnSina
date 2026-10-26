"""Этап 2, коммит 3: Invoice/InvoiceItem.

Сценарии: замороженная цена в позиции (правка Service.price задним числом
не трогает уже выставленные счета), скидка выше порога блокирует issue,
approve-discount снимает блок, cancel только из draft/unpaid.
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
        full_name=f"Тест Счёт {email}",
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
        full_name="Пациент Счётный Тестович",
        short_name="Пациент С.",
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


def test_create_invoice_freezes_price_and_recomputes_totals(client, db_session):
    reception = _make_employee(db_session, email="inv-reception@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101400101")
    service_id = _make_service(db_session, code="INV-SVC-1", price=200000)

    headers = _login(client, "inv-reception@test.local")
    created = client.post(
        "/api/invoices",
        headers=headers,
        json={
            "patientId": patient_id,
            "items": [{"serviceId": service_id, "quantity": 2, "discountAmount": 0}],
        },
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["status"] == "draft"
    assert body["subtotal"] == 400000
    assert body["total"] == 400000
    assert body["items"][0]["priceSnapshot"] == 200000

    # Меняем цену услуги задним числом — уже созданный счёт не должен измениться.
    service = db_session.get(Service, service_id)
    service.price = 999999
    db_session.commit()

    refetched = client.get(f"/api/invoices/{body['id']}", headers=headers)
    assert refetched.json()["items"][0]["priceSnapshot"] == 200000
    assert refetched.json()["total"] == 400000


def test_issue_blocked_by_discount_above_threshold_then_unblocked_by_approval(client, db_session):
    reception = _make_employee(db_session, email="inv-reception-2@test.local", role=EmployeeRole.reception)
    head_doctor = _make_employee(db_session, email="inv-head@test.local", role=EmployeeRole.head_doctor)
    patient_id = _make_patient(db_session, iin="900101400102")
    service_id = _make_service(db_session, code="INV-SVC-2", price=1000000)

    reception_headers = _login(client, "inv-reception-2@test.local")
    created = client.post(
        "/api/invoices",
        headers=reception_headers,
        json={
            "patientId": patient_id,
            "items": [{"serviceId": service_id, "quantity": 1, "discountAmount": 0}],
            # 20% > порог 10% по умолчанию
            "discountTotal": 200000,
        },
    )
    invoice_id = created.json()["id"]

    blocked = client.post(f"/api/invoices/{invoice_id}/issue", headers=reception_headers)
    assert blocked.status_code == 403

    reception_cannot_approve = client.post(
        f"/api/invoices/{invoice_id}/approve-discount", headers=reception_headers
    )
    assert reception_cannot_approve.status_code == 403

    head_headers = _login(client, "inv-head@test.local")
    approved = client.post(f"/api/invoices/{invoice_id}/approve-discount", headers=head_headers)
    assert approved.status_code == 200, approved.text
    assert approved.json()["discountApprovedBy"] == head_doctor.short_name

    issued = client.post(f"/api/invoices/{invoice_id}/issue", headers=reception_headers)
    assert issued.status_code == 200, issued.text
    assert issued.json()["status"] == "unpaid"


def test_editing_items_after_approval_resets_approval(client, db_session):
    reception = _make_employee(db_session, email="inv-reception-3@test.local", role=EmployeeRole.reception)
    head_doctor = _make_employee(db_session, email="inv-head-2@test.local", role=EmployeeRole.head_doctor)
    patient_id = _make_patient(db_session, iin="900101400103")
    service_id = _make_service(db_session, code="INV-SVC-3", price=1000000)

    reception_headers = _login(client, "inv-reception-3@test.local")
    head_headers = _login(client, "inv-head-2@test.local")

    created = client.post(
        "/api/invoices",
        headers=reception_headers,
        json={
            "patientId": patient_id,
            "items": [{"serviceId": service_id, "quantity": 1, "discountAmount": 0}],
            "discountTotal": 200000,
        },
    )
    invoice_id = created.json()["id"]
    client.post(f"/api/invoices/{invoice_id}/approve-discount", headers=head_headers)

    client.patch(
        f"/api/invoices/{invoice_id}/items",
        headers=reception_headers,
        json={
            "items": [{"serviceId": service_id, "quantity": 1, "discountAmount": 0}],
            "discountTotal": 200000,
        },
    )

    blocked_again = client.post(f"/api/invoices/{invoice_id}/issue", headers=reception_headers)
    assert blocked_again.status_code == 403, "правка позиций должна была снять старое одобрение"


def test_cancel_allowed_only_from_draft_or_unpaid(client, db_session):
    reception = _make_employee(db_session, email="inv-reception-4@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101400104")
    service_id = _make_service(db_session, code="INV-SVC-4", price=100000)

    headers = _login(client, "inv-reception-4@test.local")
    created = client.post(
        "/api/invoices",
        headers=headers,
        json={"patientId": patient_id, "items": [{"serviceId": service_id, "quantity": 1}]},
    )
    invoice_id = created.json()["id"]

    cancelled = client.post(
        f"/api/invoices/{invoice_id}/cancel", headers=headers, json={"reason": "Ошибка"}
    )
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "cancelled"

    cancel_again = client.post(
        f"/api/invoices/{invoice_id}/cancel", headers=headers, json={}
    )
    assert cancel_again.status_code == 409
