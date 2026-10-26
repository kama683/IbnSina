"""Врач видит в приёмах только своих пациентов, главврач/регистратор/медсестра —
всех (список, неделя, сегодня, очередь, текущий приём)."""
from datetime import date, timedelta

from app.models.appointment import Appointment, AppointmentStatus
from app.models.employee import EmployeeRole
from tests.test_invoices import _login, _make_employee, _make_patient


def _setup(db_session, tag: str):
    doc_a = _make_employee(db_session, email=f"scope-a-{tag}@test.local", role=EmployeeRole.doctor)
    doc_b = _make_employee(db_session, email=f"scope-b-{tag}@test.local", role=EmployeeRole.doctor)
    _make_employee(db_session, email=f"scope-head-{tag}@test.local", role=EmployeeRole.head_doctor)
    _make_employee(db_session, email=f"scope-rec-{tag}@test.local", role=EmployeeRole.reception)
    patient_id = _make_patient(db_session, iin=f"90010180{tag}")
    other_id = _make_patient(db_session, iin=f"90010181{tag}")
    today = date.today()
    rows = {}
    for key, doctor, patient, status in (
        ("a", doc_a, patient_id, AppointmentStatus.in_progress),
        ("b", doc_b, other_id, AppointmentStatus.scheduled),
    ):
        appointment = Appointment(
            date=today, queue_number=1, complaint=f"Жалоба {key}",
            status=status, patient_id=patient, employee_id=doctor.id,
        )
        db_session.add(appointment)
        db_session.flush()
        rows[key] = appointment.id
    db_session.commit()
    return rows


def _ids(response) -> set[int]:
    assert response.status_code == 200, response.text
    return {int(item["id"]) for item in response.json()}


def test_doctor_sees_only_own_appointments(client, db_session):
    rows = _setup(db_session, "01")
    headers = _login(client, "scope-a-01@test.local")
    today = date.today().isoformat()

    for url in (f"/api/appointments?from={today}&to={today}", "/api/appointments/today", "/api/appointments/queue"):
        ids = _ids(client.get(url, headers=headers))
        assert rows["a"] in ids and rows["b"] not in ids, url

    week = _ids(client.get("/api/appointments/week", headers=headers))
    assert rows["a"] in week and rows["b"] not in week

    current = client.get("/api/appointments/current", headers=headers)
    assert current.status_code == 200
    assert int(current.json()["id"]) == rows["a"]


def test_doctor_does_not_get_other_doctors_in_progress_as_current(client, db_session):
    rows = _setup(db_session, "02")
    headers = _login(client, "scope-b-02@test.local")  # у врача B приём не начат

    assert client.get("/api/appointments/current", headers=headers).json() is None
    assert rows["a"] not in _ids(client.get("/api/appointments/today", headers=headers))


def test_head_doctor_reception_see_everything(client, db_session):
    rows = _setup(db_session, "03")
    today = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    for email in ("scope-head-03@test.local", "scope-rec-03@test.local"):
        headers = _login(client, email)
        ids = _ids(client.get(f"/api/appointments?from={today}&to={tomorrow}", headers=headers))
        assert {rows["a"], rows["b"]} <= ids, email
        assert {rows["a"], rows["b"]} <= _ids(client.get("/api/appointments/today", headers=headers)), email
