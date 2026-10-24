"""GET /api/invoices: фильтры status/from/to, пагинация и дополнительные поля.

Нужны экрану «Стойка» и вкладке «Счета» кассы: без фильтров список отдаёт
все счета клиники (тысячи строк), а patientName/paidAmount избавляют от
запроса на каждую строку.
"""
from app.models.employee import EmployeeRole
from tests.test_invoices import _login, _make_employee, _make_patient, _make_service


def _create_invoice(client, headers, *, patient_id: int, service_id: int, issue: bool = True, discount: int = 0) -> int:
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
        assert client.post(f"/api/invoices/{invoice_id}/issue", headers=headers).status_code == 200
    return invoice_id


def test_filters_by_status_comma_separated_and_repeated(client, db_session):
    _make_employee(db_session, email="inv-list-1@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101400201")
    service_id = _make_service(db_session, code="INV-LIST-1", price=100000)
    headers = _login(client, "inv-list-1@test.local")

    draft = _create_invoice(client, headers, patient_id=patient_id, service_id=service_id, issue=False)
    unpaid = _create_invoice(client, headers, patient_id=patient_id, service_id=service_id)
    cancelled = _create_invoice(client, headers, patient_id=patient_id, service_id=service_id, issue=False)
    client.post(f"/api/invoices/{cancelled}/cancel", headers=headers, json={})

    def ids(query: str) -> set[int]:
        response = client.get(f"/api/invoices?patientId={patient_id}&{query}", headers=headers)
        assert response.status_code == 200, response.text
        return {row["id"] for row in response.json()}

    assert ids("status=unpaid") == {unpaid}
    assert ids("status=unpaid,draft") == {unpaid, draft}
    assert ids("status=unpaid&status=cancelled") == {unpaid, cancelled}
    assert ids("status=paid") == set()
    # без фильтра — все три, как и раньше
    assert ids("") == {draft, unpaid, cancelled}


def test_rejects_unknown_status(client, db_session):
    _make_employee(db_session, email="inv-list-2@test.local", role=EmployeeRole.reception)
    headers = _login(client, "inv-list-2@test.local")

    response = client.get("/api/invoices?status=unpaid,bogus", headers=headers)

    assert response.status_code == 422
    assert "bogus" in response.json()["detail"]


def test_paginates_newest_first_and_adds_patient_and_paid_amount(client, db_session):
    _make_employee(db_session, email="inv-list-3@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101400202")
    service_id = _make_service(db_session, code="INV-LIST-3", price=100000)
    headers = _login(client, "inv-list-3@test.local")
    client.post("/api/cash-shifts", headers=headers, json={"openingBalance": 0})

    first = _create_invoice(client, headers, patient_id=patient_id, service_id=service_id)
    second = _create_invoice(client, headers, patient_id=patient_id, service_id=service_id)
    third = _create_invoice(client, headers, patient_id=patient_id, service_id=service_id)
    client.post(f"/api/invoices/{second}/payments", headers=headers, json={"amount": 40000, "method": "cash"})

    page1 = client.get(f"/api/invoices?patientId={patient_id}&limit=2", headers=headers).json()
    page2 = client.get(f"/api/invoices?patientId={patient_id}&limit=2&offset=2", headers=headers).json()

    assert [row["id"] for row in page1] == [third, second]
    assert [row["id"] for row in page2] == [first]
    by_id = {row["id"]: row for row in page1}
    assert by_id[second]["paidAmount"] == 40000
    assert by_id[third]["paidAmount"] == 0
    assert by_id[second]["patientName"] == "Пациент С."
    assert by_id[second]["awaitingApproval"] is False


def test_marks_draft_with_unapproved_discount_above_threshold(client, db_session):
    _make_employee(db_session, email="inv-list-4@test.local", role=EmployeeRole.reception)
    _make_employee(db_session, email="inv-list-4-head@test.local", role=EmployeeRole.head_doctor)
    patient_id = _make_patient(db_session, iin="900101400203")
    service_id = _make_service(db_session, code="INV-LIST-4", price=100000)
    headers = _login(client, "inv-list-4@test.local")
    head_headers = _login(client, "inv-list-4-head@test.local")

    invoice_id = _create_invoice(
        client, headers, patient_id=patient_id, service_id=service_id, issue=False, discount=30000
    )

    def awaiting() -> bool:
        rows = client.get(f"/api/invoices?patientId={patient_id}", headers=headers).json()
        return next(row for row in rows if row["id"] == invoice_id)["awaitingApproval"]

    assert awaiting() is True
    assert client.post(f"/api/invoices/{invoice_id}/approve-discount", headers=head_headers).status_code == 200
    assert awaiting() is False


def test_filters_by_creation_date(client, db_session):
    _make_employee(db_session, email="inv-list-5@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101400204")
    service_id = _make_service(db_session, code="INV-LIST-5", price=100000)
    headers = _login(client, "inv-list-5@test.local")
    invoice_id = _create_invoice(client, headers, patient_id=patient_id, service_id=service_id, issue=False)

    def ids(query: str) -> set[int]:
        rows = client.get(f"/api/invoices?patientId={patient_id}&{query}", headers=headers).json()
        return {row["id"] for row in rows}

    assert ids("from=2000-01-01&to=2999-01-01") == {invoice_id}
    assert ids("to=2000-01-01") == set()
    assert ids("from=2999-01-01") == set()
