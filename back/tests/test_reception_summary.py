"""Сводка рабочего места регистратуры: GET /api/reports/reception-summary.

БД общая на всю тестовую сессию, поэтому счётчики сравниваются «до/после» —
абсолютные значения зависят от того, что насоздавали соседние тесты.
"""
from datetime import date

from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor_profile import DoctorProfile
from app.models.employee import Employee, EmployeeRole
from tests.test_invoices import (
    _login,
    _make_employee,
    _make_patient,
    _make_service,
)

PRICE = 1_000_000  # 10 000 ₸


def _summary(client, headers) -> dict:
    response = client.get("/api/reports/reception-summary", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def _make_doctor(db_session, *, email: str, office: str) -> Employee:
    doctor = _make_employee(db_session, email=email, role=EmployeeRole.doctor)
    db_session.add(DoctorProfile(employee_id=doctor.id, specialty="Терапевт", office=office))
    db_session.commit()
    return doctor


def _invoice(client, headers, *, patient_id, service_id, discount=0, issue=True) -> int:
    created = client.post(
        "/api/invoices",
        headers=headers,
        json={
            "patientId": patient_id,
            "items": [{"serviceId": service_id, "quantity": 1}],
            "discountTotal": discount,
        },
    )
    assert created.status_code == 200, created.text
    invoice_id = created.json()["id"]
    if issue:
        issued = client.post(f"/api/invoices/{invoice_id}/issue", headers=headers)
        assert issued.status_code == 200, issued.text
    return invoice_id


def test_summary_without_open_shift_has_no_shift(client, db_session):
    _make_employee(db_session, email="sum-noshift@test.local", role=EmployeeRole.reception)
    headers = _login(client, "sum-noshift@test.local")

    assert _summary(client, headers)["shift"] is None


def test_summary_shift_received_total_counts_all_methods_minus_nothing_else(client, db_session):
    _make_employee(db_session, email="sum-shift@test.local", role=EmployeeRole.reception)
    _make_employee(db_session, email="sum-other@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101910101")
    service_id = _make_service(db_session, code="SUM-SVC-1", price=PRICE)
    headers = _login(client, "sum-shift@test.local")
    other_headers = _login(client, "sum-other@test.local")

    assert client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 500000}).status_code == 200
    assert client.post("/api/cash-shifts", headers=other_headers, json={"openingBalance": 0}).status_code == 200

    mine = _invoice(client, headers, patient_id=patient_id, service_id=service_id)
    assert client.post(f"/api/invoices/{mine}/payments", headers=headers, json={"amount": 400000, "method": "cash"}).status_code == 200
    assert client.post(f"/api/invoices/{mine}/payments", headers=headers, json={"amount": 600000, "method": "card"}).status_code == 200
    # платёж другого кассира в сводку этой смены не попадает
    theirs = _invoice(client, other_headers, patient_id=patient_id, service_id=service_id)
    assert client.post(f"/api/invoices/{theirs}/payments", headers=other_headers, json={"amount": 250000, "method": "cash"}).status_code == 200

    shift = _summary(client, headers)["shift"]
    assert shift is not None
    # опенинг-баланс — не «принято», только платежи: нал 4 000 + карта 6 000 ₸
    assert shift["receivedTotal"] == 1_000_000
    assert _summary(client, other_headers)["shift"]["receivedTotal"] == 250000


def test_summary_counts_unpaid_and_flags_draft_waiting_for_head_doctor(client, db_session):
    _make_employee(db_session, email="sum-inv@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101920101")
    service_id = _make_service(db_session, code="SUM-SVC-2", price=PRICE)
    headers = _login(client, "sum-inv@test.local")
    before = _summary(client, headers)["invoices"]

    unpaid = _invoice(client, headers, patient_id=patient_id, service_id=service_id)
    # частичная оплата — тоже «не оплачено»; оплачивается наличными, нужна смена
    client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 0})
    partial = _invoice(client, headers, patient_id=patient_id, service_id=service_id)
    assert client.post(f"/api/invoices/{partial}/payments", headers=headers, json={"amount": 300000, "method": "cash"}).status_code == 200
    # полностью оплаченный — в «ждут оплаты» не попадает
    paid = _invoice(client, headers, patient_id=patient_id, service_id=service_id)
    assert client.post(f"/api/invoices/{paid}/payments", headers=headers, json={"amount": PRICE, "method": "cash"}).status_code == 200
    # черновик со скидкой 30% (> порога 10%) без подтверждения
    big_discount = _invoice(client, headers, patient_id=patient_id, service_id=service_id, discount=300000, issue=False)
    # черновик с небольшой скидкой подтверждения не требует
    small_discount = _invoice(client, headers, patient_id=patient_id, service_id=service_id, discount=50000, issue=False)

    after = _summary(client, headers)["invoices"]
    assert after["unpaidCount"] == before["unpaidCount"] + 2
    assert after["awaitingApprovalCount"] == before["awaitingApprovalCount"] + 1

    rows = {row["id"]: row for row in after["awaitingPayment"]}
    assert rows[big_discount]["awaitingApproval"] is True
    assert rows[big_discount]["status"] == "draft"
    assert rows[unpaid]["awaitingApproval"] is False
    assert rows[unpaid]["paidAmount"] == 0
    assert rows[partial]["status"] == "partial"
    assert rows[partial]["paidAmount"] == 300000
    assert rows[partial]["total"] == PRICE
    assert rows[unpaid]["patientName"]
    assert paid not in rows
    assert small_discount not in rows


def test_summary_waiting_list_puts_drafts_waiting_for_approval_first(client, db_session):
    _make_employee(db_session, email="sum-order@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101930101")
    service_id = _make_service(db_session, code="SUM-SVC-3", price=PRICE)
    headers = _login(client, "sum-order@test.local")

    # к этому моменту в БД сессии уже много unpaid от соседних тестов
    draft = _invoice(client, headers, patient_id=patient_id, service_id=service_id, discount=400000, issue=False)

    awaiting = _summary(client, headers)["invoices"]["awaitingPayment"]
    assert len(awaiting) <= 8
    assert draft in [row["id"] for row in awaiting[:3]]


def test_summary_doctors_queue_for_today(client, db_session):
    _make_employee(db_session, email="sum-doc-reception@test.local", role=EmployeeRole.reception)
    busy = _make_doctor(db_session, email="sum-busy@test.local", office="Кабинет 777")
    free = _make_doctor(db_session, email="sum-free@test.local", office="Кабинет 778")
    patient_id = _make_patient(db_session, iin="900101940101")
    headers = _login(client, "sum-doc-reception@test.local")
    before = _summary(client, headers)["queue"]

    today = date.today()

    def add(doctor, time, status):
        db_session.add(
            Appointment(
                date=today, time=time, complaint="Тест", status=status,
                patient_id=patient_id, employee_id=doctor.id,
            )
        )

    add(busy, "09:00", AppointmentStatus.in_progress)
    add(busy, "09:30", AppointmentStatus.scheduled)
    add(busy, "10:00", AppointmentStatus.scheduled)
    add(busy, "10:30", AppointmentStatus.cancelled)       # отменённые не считаются
    add(free, "11:00", AppointmentStatus.scheduled)
    add(free, "08:00", AppointmentStatus.completed)       # завершённый: врач в списке, но не «ждёт»
    db_session.commit()

    summary = _summary(client, headers)
    assert summary["queue"]["waiting"] == before["waiting"] + 3
    assert summary["queue"]["inProgress"] == before["inProgress"] + 1

    doctors = {row["employeeId"]: row for row in summary["doctors"]}
    assert doctors[busy.id] == {
        "employeeId": busy.id, "shortName": busy.short_name, "office": "Кабинет 777",
        "inProgress": True, "waiting": 2,
    }
    assert doctors[free.id]["inProgress"] is False
    assert doctors[free.id]["waiting"] == 1
    # занятые врачи идут раньше свободных
    order = [row["employeeId"] for row in summary["doctors"]]
    assert order.index(busy.id) < order.index(free.id)


def test_summary_is_available_to_head_doctor_but_not_to_doctor(client, db_session):
    _make_employee(db_session, email="sum-head@test.local", role=EmployeeRole.head_doctor)
    _make_employee(db_session, email="sum-plain-doctor@test.local", role=EmployeeRole.doctor)

    head = client.get("/api/reports/reception-summary", headers=_login(client, "sum-head@test.local"))
    doctor = client.get("/api/reports/reception-summary", headers=_login(client, "sum-plain-doctor@test.local"))

    assert head.status_code == 200
    assert doctor.status_code == 403
