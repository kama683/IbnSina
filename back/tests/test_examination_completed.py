"""Страница осмотра после «Завершить приём»: сегодняшний завершённый приём
отдаётся как итог (а не 404), вчерашний — по-прежнему «активного нет»."""
from datetime import date, timedelta

from app.models.appointment import Appointment, AppointmentStatus
from app.models.employee import EmployeeRole
from tests.test_invoices import _login, _make_employee, _make_patient


def _appointment(db_session, *, doctor_id: int, patient_id: int, day: date) -> None:
    db_session.add(Appointment(
        date=day, queue_number=1, complaint="Жалоба", status=AppointmentStatus.completed,
        patient_id=patient_id, employee_id=doctor_id,
    ))
    db_session.commit()


def test_completed_today_is_returned_as_summary(client, db_session):
    doctor = _make_employee(db_session, email="exam-done-doc@test.local", role=EmployeeRole.doctor)
    patient_id = _make_patient(db_session, iin="900101701001")
    _appointment(db_session, doctor_id=doctor.id, patient_id=patient_id, day=date.today())
    headers = _login(client, "exam-done-doc@test.local")

    response = client.get(f"/api/patients/{patient_id}/examination", headers=headers)

    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_completed_on_another_day_is_still_not_found(client, db_session):
    doctor = _make_employee(db_session, email="exam-old-doc@test.local", role=EmployeeRole.doctor)
    patient_id = _make_patient(db_session, iin="900101701002")
    _appointment(db_session, doctor_id=doctor.id, patient_id=patient_id, day=date.today() - timedelta(days=1))
    headers = _login(client, "exam-old-doc@test.local")

    response = client.get(f"/api/patients/{patient_id}/examination", headers=headers)

    assert response.status_code == 404
