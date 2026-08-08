"""Этап 1, коммит 3: многодокторская запись.

Матрица (test_rbac_matrix.py) уже проверяет, что reception допущен до
POST /appointments. Здесь — сценарии, которые матрица не покрывает: выбор
конкретного врача, жёсткий reject вне графика (§6 п.6), и что нельзя
записать на сотрудника без doctor_profile.
"""
from datetime import date, timedelta

from app.models.doctor_profile import DoctorProfile
from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
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
        full_name=f"Тест Бронь {email}",
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


def _make_patient(db_session, *, iin: str) -> int:
    from app.models.patient import Patient

    patient = Patient(
        iin=iin,
        full_name="Пациент Тестовый Тестович",
        short_name="Пациент Т.",
        birth_date=date(1990, 1, 1),
        gender="М",
        area="Участок 1",
    )
    db_session.add(patient)
    db_session.commit()
    return patient.id


def test_reception_books_appointment_for_chosen_doctor_within_working_hours(client, db_session):
    reception = _make_employee(
        db_session, email="booking-reception@test.local", role=EmployeeRole.reception, with_profile=False
    )
    doctor = _make_employee(
        db_session, email="booking-doctor@test.local", role=EmployeeRole.doctor, with_profile=True
    )
    monday = _next_weekday("mon")
    db_session.add(
        Schedule(
            employee_id=doctor.id, day_id="mon", label="Понедельник",
            enabled=True, start="09:00", end="12:00",
        )
    )
    db_session.commit()
    patient_id = _make_patient(db_session, iin="900101300111")

    headers = _login(client, "booking-reception@test.local")
    response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": patient_id,
            "employeeId": doctor.id,
            "date": monday.isoformat(),
            "time": "10:00",
            "complaint": "Жалоба",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["employeeId"] == str(doctor.id)
    assert body["createdBy"] == reception.short_name


def test_booking_outside_working_hours_is_rejected(client, db_session):
    doctor = _make_employee(
        db_session, email="booking-doctor-hours@test.local", role=EmployeeRole.doctor, with_profile=True
    )
    monday = _next_weekday("mon")
    db_session.add(
        Schedule(
            employee_id=doctor.id, day_id="mon", label="Понедельник",
            enabled=True, start="09:00", end="12:00",
        )
    )
    db_session.commit()
    patient_id = _make_patient(db_session, iin="900101300112")

    headers = _login(client, "booking-doctor-hours@test.local")
    response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": patient_id,
            "employeeId": doctor.id,
            "date": monday.isoformat(),
            "time": "08:00",
            "complaint": "Жалоба",
        },
    )
    assert response.status_code == 400


def test_booking_on_disabled_day_is_rejected(client, db_session):
    doctor = _make_employee(
        db_session, email="booking-doctor-disabled-day@test.local", role=EmployeeRole.doctor, with_profile=True
    )
    tuesday = _next_weekday("tue")
    db_session.add(
        Schedule(
            employee_id=doctor.id, day_id="tue", label="Вторник",
            enabled=False, start="09:00", end="12:00",
        )
    )
    db_session.commit()
    patient_id = _make_patient(db_session, iin="900101300113")

    headers = _login(client, "booking-doctor-disabled-day@test.local")
    response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": patient_id,
            "employeeId": doctor.id,
            "date": tuesday.isoformat(),
            "time": "10:00",
            "complaint": "Жалоба",
        },
    )
    assert response.status_code == 400


def test_booking_to_employee_without_doctor_profile_is_rejected(client, db_session):
    reception = _make_employee(
        db_session, email="booking-reception-2@test.local", role=EmployeeRole.reception, with_profile=False
    )
    accountant = _make_employee(
        db_session, email="booking-accountant@test.local", role=EmployeeRole.accountant, with_profile=False
    )
    patient_id = _make_patient(db_session, iin="900101300114")

    headers = _login(client, "booking-reception-2@test.local")
    response = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": patient_id,
            "employeeId": accountant.id,
            "date": _next_weekday("mon").isoformat(),
            "time": "10:00",
            "complaint": "Жалоба",
        },
    )
    assert response.status_code == 404
