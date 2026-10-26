"""Расширение регистратуры, этап 1: приёмы пациента, отмена по справочнику
причин, перенос к другому врачу, completed_at, слот отменённого приёма.
"""
from datetime import date, datetime, timedelta

from sqlalchemy import func, text

from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor_profile import DoctorProfile
from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.patient import Patient
from app.models.schedule import Schedule
from tests.test_appointment_cancellation import (
    _login,
    _make_appointment,
    _make_employee,
    _next_weekday,
)


def _doctor(db_session, *, email: str, start="09:00", end="10:30", day="mon") -> Employee:
    doctor = _make_employee(db_session, email=email, role=EmployeeRole.doctor, with_profile=True)
    db_session.add(
        Schedule(employee_id=doctor.id, day_id=day, label=day, enabled=True, start=start, end=end)
    )
    db_session.commit()
    return doctor


def _reception(db_session, email: str) -> Employee:
    return _make_employee(db_session, email=email, role=EmployeeRole.reception, with_profile=False)


def _patient(db_session, iin: str) -> Patient:
    patient = Patient(
        iin=iin, full_name="Пациент Этапный Тестович", short_name="Пациент Э.",
        birth_date=date(1990, 1, 1), gender="М",
    )
    db_session.add(patient)
    db_session.commit()
    return patient


def _book(db_session, doctor: Employee, patient: Patient, day: date,
          status=AppointmentStatus.scheduled) -> Appointment:
    last = (
        db_session.query(func.max(Appointment.queue_number))
        .filter(Appointment.employee_id == doctor.id, Appointment.date == day)
        .scalar()
    )
    appointment = Appointment(
        date=day, queue_number=(last or 0) + 1, complaint="Жалоба", status=status,
        patient_id=patient.id, employee_id=doctor.id, created_by_id=doctor.id,
    )
    db_session.add(appointment)
    db_session.commit()
    return appointment


def _db_now(db_session) -> datetime:
    return db_session.execute(text("SELECT now()")).scalar().replace(tzinfo=None)


# ----------------------------------------------------------- причина отмены

def test_cancel_requires_reason_code(client, db_session):
    _reception(db_session, "s1-cancel-1@test.local")
    doctor = _doctor(db_session, email="s1-cancel-1-doc@test.local")
    appointment = _make_appointment(
        db_session, employee_id=doctor.id, created_by_id=doctor.id, day=_next_weekday("mon"), tag="09:00"
    )
    headers = _login(client, "s1-cancel-1@test.local")

    response = client.patch(
        f"/api/appointments/{appointment.id}", headers=headers, json={"status": "cancelled"}
    )

    assert response.status_code == 422
    assert "причин" in response.json()["detail"]
    db_session.expire_all()
    assert db_session.get(Appointment, appointment.id).status == AppointmentStatus.scheduled


def test_cancel_with_code_stores_it_and_drops_free_text(client, db_session):
    _reception(db_session, "s1-cancel-2@test.local")
    doctor = _doctor(db_session, email="s1-cancel-2-doc@test.local")
    appointment = _make_appointment(
        db_session, employee_id=doctor.id, created_by_id=doctor.id, day=_next_weekday("mon"), tag="09:00"
    )
    headers = _login(client, "s1-cancel-2@test.local")

    response = client.patch(
        f"/api/appointments/{appointment.id}",
        headers=headers,
        # текст при коде, отличном от other, не сохраняется — причина это сам код
        json={"status": "cancelled", "cancellationReasonCode": "patient_no_contact", "cancellationReason": "не нужно"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "cancelled"
    assert body["cancellationReasonCode"] == "patient_no_contact"
    assert body["cancellationReason"] is None
    assert body["cancelledAt"] is not None


def test_cancel_other_requires_text(client, db_session):
    _reception(db_session, "s1-cancel-3@test.local")
    doctor = _doctor(db_session, email="s1-cancel-3-doc@test.local")
    appointment = _make_appointment(
        db_session, employee_id=doctor.id, created_by_id=doctor.id, day=_next_weekday("mon"), tag="09:00"
    )
    headers = _login(client, "s1-cancel-3@test.local")
    url = f"/api/appointments/{appointment.id}"

    no_text = client.patch(url, headers=headers, json={"status": "cancelled", "cancellationReasonCode": "other"})
    blank = client.patch(
        url, headers=headers,
        json={"status": "cancelled", "cancellationReasonCode": "other", "cancellationReason": "   "},
    )
    too_long = client.patch(
        url, headers=headers,
        json={"status": "cancelled", "cancellationReasonCode": "other", "cancellationReason": "я" * 301},
    )
    ok = client.patch(
        url, headers=headers,
        json={"status": "cancelled", "cancellationReasonCode": "other", "cancellationReason": " Уехал в отпуск "},
    )

    assert (no_text.status_code, blank.status_code, too_long.status_code) == (422, 422, 422)
    assert ok.status_code == 200, ok.text
    assert ok.json()["cancellationReason"] == "Уехал в отпуск"


def test_unknown_reason_code_is_rejected(client, db_session):
    _reception(db_session, "s1-cancel-4@test.local")
    doctor = _doctor(db_session, email="s1-cancel-4-doc@test.local")
    appointment = _make_appointment(
        db_session, employee_id=doctor.id, created_by_id=doctor.id, day=_next_weekday("mon"), tag="09:00"
    )
    headers = _login(client, "s1-cancel-4@test.local")

    response = client.patch(
        f"/api/appointments/{appointment.id}", headers=headers,
        json={"status": "cancelled", "cancellationReasonCode": "bored"},
    )

    assert response.status_code == 422


# --------------------------------------------- отмена/перенос только scheduled

def test_cancel_and_reschedule_only_from_scheduled(client, db_session):
    _reception(db_session, "s1-status@test.local")
    doctor = _doctor(db_session, email="s1-status-doc@test.local", end="12:00")
    patient = _patient(db_session, "900101910201")
    monday = _next_weekday("mon")
    headers = _login(client, "s1-status@test.local")

    for status in [
        AppointmentStatus.completed,
        AppointmentStatus.in_progress,
        AppointmentStatus.cancelled,
    ]:
        appointment = _book(db_session, doctor, patient, monday, status)
        cancel = client.patch(
            f"/api/appointments/{appointment.id}", headers=headers,
            json={"status": "cancelled", "cancellationReasonCode": "patient_cancelled"},
        )
        move = client.patch(f"/api/appointments/{appointment.id}", headers=headers, json={"date": (monday + timedelta(days=7)).isoformat()})
        assert cancel.status_code == 409, (status, cancel.text)
        assert move.status_code == 409, (status, move.text)
        db_session.expire_all()
        assert db_session.get(Appointment, appointment.id).status == status


# ---------------------------------------------------------------- перенос на другой день

def test_reschedule_to_another_day_goes_to_the_end_of_that_queue(client, db_session):
    _reception(db_session, "s1-day-move@test.local")
    doctor = _doctor(db_session, email="s1-day-move-doc@test.local")
    patient = _patient(db_session, "900101910204")
    other = _patient(db_session, "900101910214")
    monday = _next_weekday("mon")
    next_monday = monday + timedelta(days=7)
    headers = _login(client, "s1-day-move@test.local")
    moving = _book(db_session, doctor, patient, monday)
    _book(db_session, doctor, other, next_monday)

    response = client.patch(
        f"/api/appointments/{moving.id}", headers=headers, json={"date": next_monday.isoformat()}
    )

    assert response.status_code == 200, response.text
    assert response.json()["queueNumber"] == 2, "в очереди нового дня пациент последний"
    assert "time" not in response.json()


def test_reschedule_to_non_working_day_is_rejected(client, db_session):
    _reception(db_session, "s1-day-off@test.local")
    doctor = _doctor(db_session, email="s1-day-off-doc@test.local")  # принимает только по понедельникам
    patient = _patient(db_session, "900101910215")
    headers = _login(client, "s1-day-off@test.local")
    appointment = _book(db_session, doctor, patient, _next_weekday("mon"))

    response = client.patch(
        f"/api/appointments/{appointment.id}", headers=headers,
        json={"date": _next_weekday("tue").isoformat()},
    )

    assert response.status_code == 400, response.text


# --------------------------------------------------------- перенос к другому врачу

def test_reschedule_to_another_doctor(client, db_session):
    _reception(db_session, "s1-doc-move@test.local")
    first = _doctor(db_session, email="s1-doc-move-a@test.local")
    second = _doctor(db_session, email="s1-doc-move-b@test.local")
    patient = _patient(db_session, "900101910205")
    monday = _next_weekday("mon")
    headers = _login(client, "s1-doc-move@test.local")
    appointment = _book(db_session, first, patient, monday)
    _book(db_session, second, _patient(db_session, "900101910216"), monday)

    moved = client.patch(
        f"/api/appointments/{appointment.id}", headers=headers,
        json={"employeeId": second.id, "date": monday.isoformat()},
    )

    assert moved.status_code == 200, moved.text
    assert moved.json()["employeeId"] == str(second.id)
    assert moved.json()["queueNumber"] == 2, "встал в конец очереди второго врача"
    db_session.expire_all()
    assert db_session.get(Appointment, appointment.id).employee_id == second.id


def test_reschedule_to_another_doctor_must_be_bookable(client, db_session):
    _reception(db_session, "s1-doc-move2@test.local")
    first = _doctor(db_session, email="s1-doc-move2-a@test.local")
    second = _doctor(db_session, email="s1-doc-move2-b@test.local")
    not_a_doctor = _make_employee(
        db_session, email="s1-doc-move2-nurse@test.local", role=EmployeeRole.nurse, with_profile=False
    )
    patient = _patient(db_session, "900101910206")
    monday = _next_weekday("mon")
    headers = _login(client, "s1-doc-move2@test.local")
    appointment = _book(db_session, first, patient, monday)

    not_bookable = client.patch(
        f"/api/appointments/{appointment.id}", headers=headers, json={"employeeId": not_a_doctor.id}
    )
    missing = client.patch(
        f"/api/appointments/{appointment.id}", headers=headers, json={"employeeId": 99_999_999}
    )

    assert not_bookable.status_code == 404
    assert missing.status_code == 404
    db_session.expire_all()
    assert db_session.get(Appointment, appointment.id).employee_id == first.id


def test_doctor_cannot_hand_off_colleagues_appointment(client, db_session):
    owner = _doctor(db_session, email="s1-hand-owner@test.local")
    _doctor(db_session, email="s1-hand-other@test.local")
    third = _doctor(db_session, email="s1-hand-third@test.local")
    patient = _patient(db_session, "900101910207")
    appointment = _book(db_session, owner, patient, _next_weekday("mon"))
    headers = _login(client, "s1-hand-other@test.local")

    response = client.patch(
        f"/api/appointments/{appointment.id}", headers=headers, json={"employeeId": third.id}
    )

    assert response.status_code == 403


# ------------------------------------------------------------- completed_at

def test_completed_at_is_set_when_doctor_completes(client, db_session):
    doctor = _doctor(db_session, email="s1-done-doc@test.local")
    patient = _patient(db_session, "900101910208")
    appointment = _book(db_session, doctor, patient, _next_weekday("mon"), AppointmentStatus.in_progress)
    headers = _login(client, "s1-done-doc@test.local")
    before = _db_now(db_session)

    response = client.patch(
        f"/api/appointments/{appointment.id}", headers=headers, json={"status": "completed"}
    )

    assert response.status_code == 200, response.text
    completed_at = datetime.fromisoformat(response.json()["completedAt"])
    assert before - timedelta(seconds=5) <= completed_at <= _db_now(db_session) + timedelta(seconds=5)
    assert response.json()["status"] == "completed"


def test_cancelled_appointment_has_no_completed_at(client, db_session):
    _reception(db_session, "s1-nodone@test.local")
    doctor = _doctor(db_session, email="s1-nodone-doc@test.local")
    appointment = _make_appointment(
        db_session, employee_id=doctor.id, created_by_id=doctor.id, day=_next_weekday("mon"), tag="09:00"
    )
    headers = _login(client, "s1-nodone@test.local")

    response = client.patch(
        f"/api/appointments/{appointment.id}", headers=headers,
        json={"status": "cancelled", "cancellationReasonCode": "rescheduled"},
    )

    assert response.json()["completedAt"] is None


# --------------------------------------------------- GET /api/appointments

def test_list_by_patient_and_status(client, db_session):
    _reception(db_session, "s1-list@test.local")
    doctor = _doctor(db_session, email="s1-list-doc@test.local", end="12:00")
    patient = _patient(db_session, "900101910209")
    other = _patient(db_session, "900101910210")
    monday = _next_weekday("mon")
    _book(db_session, doctor, patient, monday)
    _book(db_session, doctor, patient, monday, AppointmentStatus.cancelled)
    _book(db_session, doctor, patient, monday, AppointmentStatus.completed)
    _book(db_session, doctor, other, monday)
    headers = _login(client, "s1-list@test.local")

    def numbers(query: str) -> list[int]:
        response = client.get(f"/api/appointments?{query}", headers=headers)
        assert response.status_code == 200, response.text
        return [row["queueNumber"] for row in response.json()]

    assert numbers(f"patientId={patient.id}") == [1, 2, 3]
    assert numbers(f"patientId={patient.id}&status=scheduled,in_progress") == [1]
    assert numbers(f"patientId={patient.id}&status=scheduled&status=completed") == [1, 3]
    # «ближайший неотменённый»: с сегодняшней даты и без отменённых
    future = numbers(f"patientId={patient.id}&status=scheduled,in_progress&from={date.today().isoformat()}")
    assert future == [1]
    assert numbers(f"patientId={patient.id}&from={(monday + timedelta(days=1)).isoformat()}") == []


def test_list_rows_carry_office_and_cancellation_code(client, db_session):
    _reception(db_session, "s1-fields@test.local")
    doctor = _doctor(db_session, email="s1-fields-doc@test.local")
    db_session.query(DoctorProfile).filter(DoctorProfile.employee_id == doctor.id).update({"office": "Кабинет 321"})
    db_session.commit()
    patient = _patient(db_session, "900101910211")
    _book(db_session, doctor, patient, _next_weekday("mon"))
    headers = _login(client, "s1-fields@test.local")

    rows = client.get(f"/api/appointments?patientId={patient.id}", headers=headers).json()

    assert rows[0]["office"] == "Кабинет 321"
    assert rows[0]["cancellationReasonCode"] is None
    assert rows[0]["completedAt"] is None


def test_list_requires_some_scope_and_valid_status(client, db_session):
    _reception(db_session, "s1-scope@test.local")
    headers = _login(client, "s1-scope@test.local")

    assert client.get("/api/appointments", headers=headers).status_code == 422
    assert client.get("/api/appointments?status=scheduled", headers=headers).status_code == 422
    bad = client.get("/api/appointments?patientId=1&status=bogus", headers=headers)
    assert bad.status_code == 422
    assert "bogus" in bad.json()["detail"]


def test_completed_within_window_newest_first(client, db_session):
    _reception(db_session, "s1-recent@test.local")
    doctor = _doctor(db_session, email="s1-recent-doc@test.local")
    patient = _patient(db_session, "900101910212")
    now = _db_now(db_session)
    today = now.date()

    def completed(minutes_ago: int | None, status=AppointmentStatus.completed) -> Appointment:
        row = _book(db_session, doctor, patient, today, status)
        row.duration_minutes = 20
        row.completed_at = now - timedelta(minutes=minutes_ago) if minutes_ago is not None else None
        db_session.commit()
        return row

    recent = completed(10)
    earlier = completed(100)
    old = completed(300)
    cancelled = completed(5, AppointmentStatus.cancelled)
    headers = _login(client, "s1-recent@test.local")

    response = client.get("/api/appointments?completedWithin=120", headers=headers)

    ids = [row["id"] for row in response.json()]
    assert ids.index(str(recent.id)) < ids.index(str(earlier.id)), "новые первыми"
    assert str(old.id) not in ids, "завершён 5 часов назад — за окном"
    assert str(cancelled.id) not in ids, "отменённый — не «вышел от врача»"
    assert all(row["status"] == "completed" for row in response.json())


def test_completed_within_falls_back_to_start_plus_duration(client, db_session):
    _reception(db_session, "s1-fallback@test.local")
    doctor = _doctor(db_session, email="s1-fallback-doc@test.local")
    patient = _patient(db_session, "900101910213")
    now = _db_now(db_session)
    start = (now - timedelta(minutes=50)).replace(second=0, microsecond=0)
    row = _book(db_session, doctor, patient, start.date(), AppointmentStatus.completed)
    row.started_at = start
    row.duration_minutes = 20  # без completed_at: завершён ≈ через 20 минут после начала
    db_session.commit()
    headers = _login(client, "s1-fallback@test.local")

    response = client.get("/api/appointments?completedWithin=60", headers=headers)

    assert str(row.id) in [r["id"] for r in response.json()]


def test_list_is_forbidden_for_accountant(client, db_session):
    _make_employee(db_session, email="s1-acc@test.local", role=EmployeeRole.accountant, with_profile=False)
    headers = _login(client, "s1-acc@test.local")

    assert client.get("/api/appointments?patientId=1", headers=headers).status_code == 403
