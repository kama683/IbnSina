"""Заполняет БД тестовыми данными из front/lib/mock-data.ts."""

from datetime import date

from app.database import SessionLocal
from app.models import Appointment, AppointmentStatus, Doctor, Patient

DOCTOR_DATA = {
    "full_name": "Шарипов Муслим Юнусалиевич",
    "first_name_patronymic": "Шарипов Муслим",
    "short_name": "Шарипов М.Ю.",
    "initials": "AC",
    "role": "Эндокринолог",
    "area": "Участок №3",
}

APPOINTMENTS_DATA = [
    ("08:30", "Нурмаганбетов Д.Е.", "Боль в горле, температура", AppointmentStatus.completed),
    ("09:00", "Ахметова А.С.", "Повышенное давление, головная боль", AppointmentStatus.in_progress),
    ("09:30", "Касымова Г.Р.", "Кашель, насморк", AppointmentStatus.scheduled),
    ("10:00", "Жумабеков А.Т.", "Боль в спине", AppointmentStatus.scheduled),
    ("10:30", "Ибраева М.С.", "Плановый осмотр", AppointmentStatus.scheduled),
    ("11:00", "Садыков Е.Н.", "Аллергическая реакция", AppointmentStatus.cancelled),
    ("11:30", "Тлеубергенова А.К.", "Головокружение", AppointmentStatus.scheduled),
]


def seed() -> None:
    db = SessionLocal()
    try:
        if db.query(Doctor).first():
            print("Данные уже есть — пропускаем seed.")
            return

        doctor = Doctor(**DOCTOR_DATA)
        db.add(doctor)
        db.flush()

        patients_by_name: dict[str, Patient] = {}
        today = date.today()

        for time, patient_name, complaint, status in APPOINTMENTS_DATA:
            if patient_name not in patients_by_name:
                patient = Patient(full_name=patient_name)
                db.add(patient)
                db.flush()
                patients_by_name[patient_name] = patient
            else:
                patient = patients_by_name[patient_name]

            db.add(
                Appointment(
                    date=today,
                    time=time,
                    complaint=complaint,
                    status=status,
                    patient_id=patient.id,
                    doctor_id=doctor.id,
                )
            )

        db.commit()
        print(f"Добавлено: 1 врач, {len(patients_by_name)} пациентов, {len(APPOINTMENTS_DATA)} приёмов.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
