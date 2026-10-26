"""Счёт «по приёму»: appointmentId проверяется при создании и годится как фильтр
списка (блок «Вышли от врача» на стойке показывает «Счёт №…» вместо кнопки)."""
from datetime import date

from sqlalchemy import func

from app.models.appointment import Appointment, AppointmentStatus
from app.models.employee import EmployeeRole
from tests.test_invoices import _login, _make_employee, _make_patient, _make_service


def _appointment(db_session, *, doctor_id: int, patient_id: int) -> Appointment:
    last = (
        db_session.query(func.max(Appointment.queue_number))
        .filter(Appointment.employee_id == doctor_id, Appointment.date == date.today())
        .scalar()
    )
    appointment = Appointment(
        date=date.today(), queue_number=(last or 0) + 1, complaint="Жалоба", status=AppointmentStatus.completed,
        patient_id=patient_id, employee_id=doctor_id,
    )
    db_session.add(appointment)
    db_session.commit()
    return appointment


def _setup(db_session, tag: str):
    _make_employee(db_session, email=f"inv-appt-{tag}@test.local", role=EmployeeRole.reception)
    doctor = _make_employee(db_session, email=f"inv-appt-{tag}-doc@test.local", role=EmployeeRole.doctor)
    patient_id = _make_patient(db_session, iin=f"9001015{tag}")
    other_id = _make_patient(db_session, iin=f"9001016{tag}")
    service_id = _make_service(db_session, code=f"INV-APPT-{tag}", price=100000)
    return doctor, patient_id, other_id, service_id


def _create(client, headers, patient_id, service_id, appointment_id=None):
    payload = {"patientId": patient_id, "items": [{"serviceId": service_id, "quantity": 1}]}
    if appointment_id is not None:
        payload["appointmentId"] = appointment_id
    return client.post("/api/invoices", headers=headers, json=payload)


def test_invoice_is_linked_to_the_patients_appointment(client, db_session):
    doctor, patient_id, _other, service_id = _setup(db_session, "0101")
    appointment = _appointment(db_session, doctor_id=doctor.id, patient_id=patient_id)
    headers = _login(client, "inv-appt-0101@test.local")

    response = _create(client, headers, patient_id, service_id, appointment.id)

    assert response.status_code == 200, response.text
    assert response.json()["appointmentId"] == appointment.id


def test_appointment_of_another_patient_is_rejected(client, db_session):
    doctor, patient_id, other_id, service_id = _setup(db_session, "0102")
    foreign = _appointment(db_session, doctor_id=doctor.id, patient_id=other_id)
    headers = _login(client, "inv-appt-0102@test.local")

    response = _create(client, headers, patient_id, service_id, foreign.id)

    assert response.status_code == 400
    assert "другому пациенту" in response.json()["detail"]


def test_unknown_appointment_is_404_not_500(client, db_session):
    _doctor, patient_id, _other, service_id = _setup(db_session, "0103")
    headers = _login(client, "inv-appt-0103@test.local")

    response = _create(client, headers, patient_id, service_id, 99_999_999)

    assert response.status_code == 404


def test_invoice_without_appointment_still_works(client, db_session):
    _doctor, patient_id, _other, service_id = _setup(db_session, "0104")
    headers = _login(client, "inv-appt-0104@test.local")

    response = _create(client, headers, patient_id, service_id)

    assert response.status_code == 200
    assert response.json()["appointmentId"] is None


def test_list_filters_by_appointment_ids(client, db_session):
    doctor, patient_id, _other, service_id = _setup(db_session, "0105")
    first = _appointment(db_session, doctor_id=doctor.id, patient_id=patient_id)
    second = _appointment(db_session, doctor_id=doctor.id, patient_id=patient_id)
    third = _appointment(db_session, doctor_id=doctor.id, patient_id=patient_id)
    headers = _login(client, "inv-appt-0105@test.local")
    for appointment in (first, second):
        assert _create(client, headers, patient_id, service_id, appointment.id).status_code == 200
    _create(client, headers, patient_id, service_id)  # без приёма

    def linked(query: str) -> list[int]:
        response = client.get(f"/api/invoices?patientId={patient_id}&{query}", headers=headers)
        assert response.status_code == 200, response.text
        return sorted(row["appointmentId"] for row in response.json())

    assert linked(f"appointmentId={first.id},{second.id},{third.id}") == sorted([first.id, second.id])
    assert linked(f"appointmentId={first.id}&appointmentId={third.id}") == [first.id]
    assert linked(f"appointmentId={third.id}") == []


def test_list_rejects_non_numeric_appointment_id(client, db_session):
    _setup(db_session, "0106")
    headers = _login(client, "inv-appt-0106@test.local")

    assert client.get("/api/invoices?appointmentId=abc", headers=headers).status_code == 422


