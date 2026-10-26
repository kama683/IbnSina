"""Список пациентов: вкладки «Мои пациенты», «Диспансерные», «Новые»."""
from datetime import date

from app.models.appointment import Appointment, AppointmentStatus
from app.models.employee import EmployeeRole
from app.models.patient import Patient
from tests.test_invoices import _login, _make_employee, _make_patient


def _appointment(db_session, doctor_id: int, patient_id: int, status: AppointmentStatus, number: int):
    db_session.add(Appointment(
        date=date.today(), queue_number=number, complaint="Жалоба", status=status,
        patient_id=patient_id, employee_id=doctor_id,
    ))
    db_session.commit()


def _ids(client, headers, query: str) -> set[int]:
    response = client.get(f"/api/patients?limit=100&search=Фильтр&{query}", headers=headers)
    assert response.status_code == 200, response.text
    return {int(item["id"]) for item in response.json()["items"]}


def _patient(db_session, iin: str, *, dispensary: bool = False) -> int:
    patient_id = _make_patient(db_session, iin=iin)
    patient = db_session.get(Patient, patient_id)
    patient.full_name = f"Фильтр Тестов {iin}"
    patient.dispensary = dispensary
    db_session.commit()
    return patient_id


def test_list_filters(client, db_session):
    doctor = _make_employee(db_session, email="pf-doc@test.local", role=EmployeeRole.doctor)
    other = _make_employee(db_session, email="pf-other@test.local", role=EmployeeRole.doctor)
    seen = _patient(db_session, "900101920001")                       # завершённый приём у меня
    booked_mine = _patient(db_session, "900101920002")                # записан ко мне, ещё не был
    dispensary = _patient(db_session, "900101920003", dispensary=True)
    of_other = _patient(db_session, "900101920004")                   # приём у другого врача
    _appointment(db_session, doctor.id, seen, AppointmentStatus.completed, 1)
    _appointment(db_session, doctor.id, booked_mine, AppointmentStatus.scheduled, 2)
    _appointment(db_session, other.id, of_other, AppointmentStatus.completed, 1)
    headers = _login(client, "pf-doc@test.local")

    assert _ids(client, headers, "filter=all") == {seen, booked_mine, dispensary, of_other}
    assert _ids(client, headers, "filter=mine") == {seen, booked_mine}
    assert _ids(client, headers, "filter=dispensary") == {dispensary}
    # «новые» — ни одного завершённого приёма (ни у кого)
    assert _ids(client, headers, "filter=new") == {booked_mine, dispensary}


def test_unknown_filter_is_rejected(client, db_session):
    _make_employee(db_session, email="pf-bad@test.local", role=EmployeeRole.doctor)
    headers = _login(client, "pf-bad@test.local")

    assert client.get("/api/patients?filter=bogus", headers=headers).status_code == 422
