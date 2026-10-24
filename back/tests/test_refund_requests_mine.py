"""GET /api/refund-requests?mine=true — вкладка кассы «Мои заявки»."""
from app.models.employee import EmployeeRole
from tests.test_refund_requests import (
    _login,
    _make_employee,
    _make_paid_invoice_and_payment,
    _make_patient,
    _make_service,
)


def test_mine_returns_only_own_requests(client, db_session):
    _make_employee(db_session, email="refund-mine-a@test.local", role=EmployeeRole.reception)
    _make_employee(db_session, email="refund-mine-b@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin="900101700301")
    service_id = _make_service(db_session, code="REF-MINE-1", price=100000)
    headers_a = _login(client, "refund-mine-a@test.local")
    headers_b = _login(client, "refund-mine-b@test.local")

    def request_refund(headers) -> int:
        _invoice_id, payment_id = _make_paid_invoice_and_payment(
            client, headers, patient_id=patient_id, service_id=service_id, price=100000
        )
        created = client.post(
            "/api/refund-requests",
            headers=headers,
            json={"paymentId": payment_id, "amount": 100000, "reason": "Тест"},
        )
        assert created.status_code == 200, created.text
        return created.json()["id"]

    mine_a = request_refund(headers_a)
    mine_b = request_refund(headers_b)

    own = {row["id"] for row in client.get("/api/refund-requests?mine=true", headers=headers_a).json()}
    everyone = {row["id"] for row in client.get("/api/refund-requests", headers=headers_a).json()}

    assert mine_a in own
    assert mine_b not in own
    assert {mine_a, mine_b} <= everyone
