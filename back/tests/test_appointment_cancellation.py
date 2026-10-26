"""Этап 1, коммит 5: PATCH /api/appointments/{id} — отмена и перенос.

Проверяет то, что test_rbac_matrix.py (пустое тело) в принципе не может
проверить: какой роли какое ИМЕННО действие разрешено (решение B, §6.1
плана) — в частности, что "свой врач" может отменить/перенести только свой
приём, а reception/head_doctor — любой, и что examination-поля (диагноз и
т.п.) для не-клинициста запрещены даже если маршрут его пропустил.
"""
from datetime import date, timedelta

from sqlalchemy import func

from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor_profile import DoctorProfile
from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.patient import Patient
from app.models.schedule import Schedule
from app.models.user import User
from app.security import hash_password

_PASSWORD = "test-pass-123"


def _next_weekday(day_id: str) -> date:
    target = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].index(day_id)
    today = date.today()
    delta = (target - today.weekday()) % 7 or 7
    return today + timedelta(days=delta)


def _make_employee(db_session, *, email: str, role: EmployeeRole, with_profile: bool) -> Employee:
    employee = Employee(
        full_name=f"Тест Отмена {email}",
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
    if with_profile:
        db_session.add(DoctorProfile(employee_id=employee.id, specialty="Терапевт"))
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


def _make_appointment(db_session, *, employee_id: int, created_by_id: int, day: date, tag: str) -> Appointment:
    iin_suffix = tag.replace(":", "")
    patient = Patient(
        iin=f"90010{employee_id:03d}{iin_suffix}",
        full_name="Пациент Тестовый Тестович",
        short_name="Пациент Т.",
        birth_date=date(1990, 1, 1),
        gender="М",
    )
    db_session.add(patient)
    db_session.flush()
    last = (
        db_session.query(func.max(Appointment.queue_number))
        .filter(Appointment.employee_id == employee_id, Appointment.date == day)
        .scalar()
    )
    appointment = Appointment(
        date=day,
        queue_number=(last or 0) + 1,
        complaint="Жалоба",
        status=AppointmentStatus.scheduled,
        patient_id=patient.id,
        employee_id=employee_id,
        created_by_id=created_by_id,
    )
    db_session.add(appointment)
    db_session.commit()
    return appointment


def test_reception_cancels_any_appointment(client, db_session):
    reception = _make_employee(
        db_session, email="cancel-reception@test.local", role=EmployeeRole.reception, with_profile=False
    )
    doctor = _make_employee(
        db_session, email="cancel-doctor-1@test.local", role=EmployeeRole.doctor, with_profile=True
    )
    appointment = _make_appointment(
        db_session, employee_id=doctor.id, created_by_id=doctor.id,
        day=_next_weekday("mon"), tag="09:00",
    )

    headers = _login(client, "cancel-reception@test.local")
    response = client.patch(
        f"/api/appointments/{appointment.id}",
        headers=headers,
        json={
            "status": "cancelled",
            "cancellationReasonCode": "other",
            "cancellationReason": "Пациент передумал",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "cancelled"
    assert body["cancelledBy"] == reception.short_name
    assert body["cancellationReason"] == "Пациент передумал"
    assert body["cancelledAt"] is not None


def test_doctor_cannot_cancel_colleague_appointment(client, db_session):
    owner = _make_employee(
        db_session, email="cancel-owner@test.local", role=EmployeeRole.doctor, with_profile=True
    )
    other_doctor = _make_employee(
        db_session, email="cancel-other-doctor@test.local", role=EmployeeRole.doctor, with_profile=True
    )
    appointment = _make_appointment(
        db_session, employee_id=owner.id, created_by_id=owner.id,
        day=_next_weekday("mon"), tag="09:00",
    )

    headers = _login(client, "cancel-other-doctor@test.local")
    response = client.patch(
        f"/api/appointments/{appointment.id}",
        headers=headers,
        json={"status": "cancelled", "cancellationReasonCode": "patient_cancelled"},
    )
    assert response.status_code == 403


def test_doctor_cancels_own_appointment(client, db_session):
    owner = _make_employee(
        db_session, email="cancel-own-doctor@test.local", role=EmployeeRole.doctor, with_profile=True
    )
    appointment = _make_appointment(
        db_session, employee_id=owner.id, created_by_id=owner.id,
        day=_next_weekday("mon"), tag="09:00",
    )

    headers = _login(client, "cancel-own-doctor@test.local")
    response = client.patch(
        f"/api/appointments/{appointment.id}",
        headers=headers,
        json={"status": "cancelled", "cancellationReasonCode": "patient_cancelled"},
    )
    assert response.status_code == 200, response.text


def test_reception_cannot_set_examination_fields(client, db_session):
    reception = _make_employee(
        db_session, email="cancel-reception-2@test.local", role=EmployeeRole.reception, with_profile=False
    )
    doctor = _make_employee(
        db_session, email="cancel-doctor-2@test.local", role=EmployeeRole.doctor, with_profile=True
    )
    appointment = _make_appointment(
        db_session, employee_id=doctor.id, created_by_id=doctor.id,
        day=_next_weekday("mon"), tag="09:00",
    )

    headers = _login(client, "cancel-reception-2@test.local")
    response = client.patch(
        f"/api/appointments/{appointment.id}",
        headers=headers,
        json={"complaints": "Новая жалоба"},
    )
    assert response.status_code == 403


def test_reschedule_revalidates_the_working_day(client, db_session):
    _make_employee(
        db_session, email="reschedule-reception@test.local", role=EmployeeRole.reception, with_profile=False
    )
    doctor = _make_employee(
        db_session, email="reschedule-doctor@test.local", role=EmployeeRole.doctor, with_profile=True
    )
    monday = _next_weekday("mon")
    db_session.add(
        Schedule(
            employee_id=doctor.id, day_id="mon", label="Понедельник",
            enabled=True, start="09:00", end="10:30",
        )
    )
    db_session.commit()
    moving = _make_appointment(
        db_session, employee_id=doctor.id, created_by_id=doctor.id, day=monday, tag="09:00"
    )

    headers = _login(client, "reschedule-reception@test.local")

    day_off = client.patch(
        f"/api/appointments/{moving.id}", headers=headers,
        json={"date": _next_weekday("tue").isoformat()},
    )
    assert day_off.status_code == 400, "врач во вторник не принимает"

    next_monday = monday + timedelta(days=7)
    ok = client.patch(f"/api/appointments/{moving.id}", headers=headers, json={"date": next_monday.isoformat()})
    assert ok.status_code == 200, ok.text
    assert ok.json()["queueNumber"] == 1
