"""Многодокторская запись с номером в очереди вместо времени.

Матрица (test_rbac_matrix.py) уже проверяет, что reception допущен до
POST /appointments. Здесь — сценарии, которые матрица не покрывает: выбор
конкретного врача, нумерация пациентов у врача на день (время не
назначается), запись только на рабочий день и что нельзя записать на
сотрудника без doctor_profile.
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
    )
    db_session.add(patient)
    db_session.commit()
    return patient.id


def _book(client, headers, patient_id, doctor_id, day):
    return client.post(
        "/api/appointments",
        headers=headers,
        json={
            "patientId": patient_id,
            "employeeId": doctor_id,
            "date": day.isoformat(),
            "complaint": "Жалоба",
        },
    )


def _doctor_with_monday(db_session, email: str) -> Employee:
    doctor = _make_employee(db_session, email=email, role=EmployeeRole.doctor, with_profile=True)
    db_session.add(
        Schedule(
            employee_id=doctor.id, day_id="mon", label="Понедельник",
            enabled=True, start="09:00", end="12:00",
        )
    )
    db_session.commit()
    return doctor


def test_reception_books_appointment_for_chosen_doctor_and_gets_queue_number(client, db_session):
    reception = _make_employee(
        db_session, email="booking-reception@test.local", role=EmployeeRole.reception, with_profile=False
    )
    doctor = _doctor_with_monday(db_session, "booking-doctor@test.local")
    monday = _next_weekday("mon")
    first_patient = _make_patient(db_session, iin="900101300111")
    second_patient = _make_patient(db_session, iin="900101300121")

    headers = _login(client, "booking-reception@test.local")
    first = _book(client, headers, first_patient, doctor.id, monday)
    second = _book(client, headers, second_patient, doctor.id, monday)

    assert first.status_code == 200, first.text
    body = first.json()
    assert body["employeeId"] == str(doctor.id)
    assert body["createdBy"] == reception.short_name
    assert body["queueNumber"] == 1
    assert "time" not in body, "время записи не назначается"
    assert body["startedAt"] is None and body["completedAt"] is None
    assert second.json()["queueNumber"] == 2


def test_queue_numbers_are_per_doctor_and_per_day(client, db_session):
    _make_employee(
        db_session, email="booking-reception-num@test.local", role=EmployeeRole.reception, with_profile=False
    )
    first_doctor = _doctor_with_monday(db_session, "booking-num-doc1@test.local")
    second_doctor = _doctor_with_monday(db_session, "booking-num-doc2@test.local")
    db_session.add_all([
        Schedule(employee_id=first_doctor.id, day_id="tue", label="Вторник", enabled=True, start="09:00", end="12:00"),
    ])
    db_session.commit()
    monday, tuesday = _next_weekday("mon"), _next_weekday("tue")
    patients = [_make_patient(db_session, iin=f"90010130013{i}") for i in range(4)]
    headers = _login(client, "booking-reception-num@test.local")

    numbers = [
        _book(client, headers, patients[0], first_doctor.id, monday).json()["queueNumber"],
        _book(client, headers, patients[1], first_doctor.id, monday).json()["queueNumber"],
        _book(client, headers, patients[2], second_doctor.id, monday).json()["queueNumber"],
        _book(client, headers, patients[3], first_doctor.id, tuesday).json()["queueNumber"],
    ]

    assert numbers == [1, 2, 1, 1]


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
    response = _book(client, headers, patient_id, doctor.id, tuesday)
    assert response.status_code == 400


def test_booking_to_employee_without_doctor_profile_is_rejected(client, db_session):
    _make_employee(
        db_session, email="booking-reception-2@test.local", role=EmployeeRole.reception, with_profile=False
    )
    accountant = _make_employee(
        db_session, email="booking-accountant@test.local", role=EmployeeRole.accountant, with_profile=False
    )
    patient_id = _make_patient(db_session, iin="900101300114")

    headers = _login(client, "booking-reception-2@test.local")
    response = _book(client, headers, patient_id, accountant.id, _next_weekday("mon"))
    assert response.status_code == 404


def test_queue_info_shows_waiting_and_next_number(client, db_session):
    doctor = _doctor_with_monday(db_session, "info-doctor@test.local")
    _make_employee(
        db_session, email="info-reception@test.local", role=EmployeeRole.reception, with_profile=False
    )
    db_session.add(
        Schedule(employee_id=doctor.id, day_id="tue", label="Вторник", enabled=False, start="09:00", end="12:00")
    )
    db_session.commit()
    monday, tuesday = _next_weekday("mon"), _next_weekday("tue")
    patient_id = _make_patient(db_session, iin="900101300115")
    headers = _login(client, "info-reception@test.local")

    def info(day):
        response = client.get(
            f"/api/appointments/queue-info?employeeId={doctor.id}&date={day.isoformat()}", headers=headers
        )
        assert response.status_code == 200, response.text
        return response.json()

    assert info(tuesday)["works"] is False, "выключенный день — не ошибка, а works=false"
    assert info(monday) == {"works": True, "waiting": 0, "nextNumber": 1}

    assert _book(client, headers, patient_id, doctor.id, monday).status_code == 200
    assert info(monday) == {"works": True, "waiting": 1, "nextNumber": 2}


def test_cancelled_appointment_keeps_its_number(client, db_session):
    """Номер не переиспользуется: после отмены №1 следующий пациент получает №2,
    а в «ждут» отменённый не считается."""
    doctor = _doctor_with_monday(db_session, "num-cancel-doctor@test.local")
    _make_employee(
        db_session, email="num-cancel-reception@test.local", role=EmployeeRole.reception, with_profile=False
    )
    monday = _next_weekday("mon")
    first_patient = _make_patient(db_session, iin="900101300116")
    second_patient = _make_patient(db_session, iin="900101300126")
    headers = _login(client, "num-cancel-reception@test.local")

    first = _book(client, headers, first_patient, doctor.id, monday)
    assert first.json()["queueNumber"] == 1
    cancelled = client.patch(
        f"/api/appointments/{first.json()['id']}",
        headers=headers,
        json={"status": "cancelled", "cancellationReasonCode": "patient_cancelled"},
    )
    assert cancelled.status_code == 200, cancelled.text

    assert _book(client, headers, second_patient, doctor.id, monday).json()["queueNumber"] == 2
    info = client.get(
        f"/api/appointments/queue-info?employeeId={doctor.id}&date={monday.isoformat()}", headers=headers
    ).json()
    assert info["waiting"] == 1 and info["nextNumber"] == 3


def test_started_at_and_duration_are_recorded_by_the_doctor(client, db_session):
    """«Начать» ставит started_at, «Завершить» — completed_at и фактическую длительность."""
    doctor = _doctor_with_monday(db_session, "fact-doctor@test.local")
    _make_employee(
        db_session, email="fact-reception@test.local", role=EmployeeRole.reception, with_profile=False
    )
    patient_id = _make_patient(db_session, iin="900101300117")
    reception_headers = _login(client, "fact-reception@test.local")
    monday = _next_weekday("mon")
    appointment_id = _book(client, reception_headers, patient_id, doctor.id, monday).json()["id"]
    headers = _login(client, "fact-doctor@test.local")

    started = client.patch(f"/api/appointments/{appointment_id}", headers=headers, json={"status": "in_progress"})
    assert started.status_code == 200, started.text
    assert started.json()["startedAt"] is not None
    assert started.json()["completedAt"] is None

    done = client.patch(f"/api/appointments/{appointment_id}", headers=headers, json={"status": "completed"})
    assert done.status_code == 200, done.text
    body = done.json()
    assert body["startedAt"] is not None and body["completedAt"] is not None
    assert body["completedAt"] >= body["startedAt"]
