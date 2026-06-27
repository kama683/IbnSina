"""Заполняет БД тестовыми данными из front/lib/mock-data.ts."""

from datetime import date

from app.database import SessionLocal
from app.models import Appointment, AppointmentStatus, Doctor, Patient
from app.models.patient_diseases import DiseaseTagVariant, PatientDisease
from app.models.patient_allergies import PatientAllergy
from app.models.vaccination import Vaccination
from app.models.hospitalization import Hospitalization
from app.models.schedule import Schedule
from app.models.health_metric import HealthMetric
from app.models.department import Department
from app.models.user import User, UserRole

DOCTOR_DATA = {
    "full_name": "Шарипов Муслим Юнусалиевич",
    "first_name_patronymic": "Шарипов Муслим",
    "short_name": "Шарипов М.Ю.",
    "initials": "AC",
    "role": "Эндокринолог",
    "area": "Участок №3",
}

DEPARTMENT_DATA = {"name": "Эндокринологическое отделение"}

DOCTOR_PROFILE_EXTRA = {
    "title": "Врач-эндокринолог",
    "office": "Кабинет 214",
    "phone": "+7 (701) 234-56-78",
    "email": "sharipov@poliklinika12.kz",
    "workplace": "Городская поликлиника №12, г. Астана, ул. Туран 24",
    "specialty": "Эндокринолог (04.02.001)",
    "qualification_category": "Высшая",
    "license_number": "0023847-МД",
    "license_valid_until": "31.12.2027",
    "about": (
        "Врач-эндокринолог с 14-летним стажем. Специализируюсь на диагностике "
        "и лечении сахарного диабета, заболеваний щитовидной железы и "
        "метаболических нарушений."
    ),
    "experience_years": 14,
}

USER_DATA = {
    "email": "sharipov@poliklinika12.kz",
    "full_name": "Шарипов Муслим Юнусалиевич",
    "role": UserRole.doctor,
}

# Ключ — short_name, как в APPOINTMENTS_DATA и mock-data.ts
PATIENTS_DATA: dict[str, dict] = {
    "Нурмаганбетов Д.Е.": {
        "full_name": "Нурмаганбетов Дулат Ерланович",
        "short_name": "Нурмаганбетов Д.Е.",
        "iin": "880623502345",
        "birth_date": date(1988, 6, 23),
        "gender": "М",
        "phone": "+7 (701) 223-45-67",
        "address": "г. Астана, пр. Республики 12, кв. 45",
        "blood_type": "A(II) Rh+",
        "dispensary": False,
    },
    "Ахметова А.С.": {
        "full_name": "Ахметова Айгерим Сериковна",
        "short_name": "Ахметова А.С.",
        "iin": "850412301234",
        "birth_date": date(1985, 4, 12),
        "gender": "Ж",
        "phone": "+7 (701) 112-34-56",
        "address": "г. Астана, ул. Сарыарка 14, кв. 28",
        "blood_type": "B(III) Rh+",
        "dispensary": True,
    },
    "Касымова Г.Р.": {
        "full_name": "Касымова Гульнара Рахимовна",
        "short_name": "Касымова Г.Р.",
        "iin": "900715603456",
        "birth_date": date(1990, 7, 15),
        "gender": "Ж",
        "phone": "+7 (701) 334-56-78",
        "address": "г. Астана, ул. Кенесары 8, кв. 12",
        "blood_type": "O(I) Rh+",
        "dispensary": True,
    },
    "Жумабеков А.Т.": {
        "full_name": "Жумабеков Асылхан Турлыбекович",
        "short_name": "Жумабеков А.Т.",
        "iin": "851209704567",
        "birth_date": date(1985, 12, 9),
        "gender": "М",
        "phone": "+7 (701) 445-67-89",
        "address": "г. Астана, ул. Бейбитшилик 22, кв. 7",
        "blood_type": "AB(IV) Rh+",
        "dispensary": False,
    },
    "Ибраева М.С.": {
        "full_name": "Ибраева Мария Сериккызы",
        "short_name": "Ибраева М.С.",
        "iin": "920331805678",
        "birth_date": date(1992, 3, 31),
        "gender": "Ж",
        "phone": "+7 (701) 556-78-90",
        "address": "г. Астана, ул. Жансугурова 5, кв. 33",
        "blood_type": "A(II) Rh−",
        "dispensary": False,
    },
    "Садыков Е.Н.": {
        "full_name": "Садыков Ержан Нурланович",
        "short_name": "Садыков Е.Н.",
        "iin": "870522906789",
        "birth_date": date(1987, 5, 22),
        "gender": "М",
        "phone": "+7 (701) 667-89-01",
        "address": "г. Астана, ул. Кабанбай батыра 18, кв. 56",
        "blood_type": "B(III) Rh+",
        "dispensary": True,
    },
    "Тлеубергенова А.К.": {
        "full_name": "Тлеубергенова Айжан Кайратовна",
        "short_name": "Тлеубергенова А.К.",
        "iin": "910814107890",
        "birth_date": date(1991, 8, 14),
        "gender": "Ж",
        "phone": "+7 (701) 778-90-12",
        "address": "г. Астана, ул. Сарайшык 3, кв. 19",
        "blood_type": "O(I) Rh+",
        "dispensary": False,
    },
}

APPOINTMENTS_DATA = [
    {
        "time": "08:30",
        "patient": "Нурмаганбетов Д.Е.",
        "complaint": "Боль в горле, температура",
        "status": AppointmentStatus.completed,
        "diagnosis_code": "J02.9",
        "diagnosis_name": "Острый фарингит",
        "objective_status": None,
    },
    {
        "time": "09:00",
        "patient": "Ахметова А.С.",
        "complaint": "Повышенное давление, головная боль",
        "status": AppointmentStatus.in_progress,
        "diagnosis_code": "I10",
        "diagnosis_name": "Эссенциальная гипертензия",
        "objective_status": (
            "АД: 150/95, ЧСС: 78, ЧДД: 18, Т: 36.6 °C\n"
            "Состояние: удовлетворительное"
        ),
    },
    {
        "time": "09:30",
        "patient": "Касымова Г.Р.",
        "complaint": "Кашель, насморк",
        "status": AppointmentStatus.scheduled,
        "diagnosis_code": None,
        "diagnosis_name": None,
        "objective_status": None,
    },
    {
        "time": "10:00",
        "patient": "Жумабеков А.Т.",
        "complaint": "Боль в спине",
        "status": AppointmentStatus.scheduled,
        "diagnosis_code": None,
        "diagnosis_name": None,
        "objective_status": None,
    },
    {
        "time": "10:30",
        "patient": "Ибраева М.С.",
        "complaint": "Плановый осмотр",
        "status": AppointmentStatus.scheduled,
        "diagnosis_code": None,
        "diagnosis_name": None,
        "objective_status": None,
    },
    {
        "time": "11:00",
        "patient": "Садыков Е.Н.",
        "complaint": "Аллергическая реакция",
        "status": AppointmentStatus.cancelled,
        "diagnosis_code": None,
        "diagnosis_name": None,
        "objective_status": None,
    },
    {
        "time": "11:30",
        "patient": "Тлеубергенова А.К.",
        "complaint": "Головокружение",
        "status": AppointmentStatus.scheduled,
        "diagnosis_code": None,
        "diagnosis_name": None,
        "objective_status": None,
    },
]

# Цветные теги заболеваний — колонка «Заболевания» на /patients (mock-data.ts)
PATIENT_DISEASES_DATA: dict[str, list[dict]] = {
    "Ахметова А.С.": [
        {"label": "Гипертония", "variant": DiseaseTagVariant.green},
        {"label": "Ожирение", "variant": DiseaseTagVariant.purple},
    ],
    "Касымова Г.Р.": [
        {"label": "Астма", "variant": DiseaseTagVariant.blue},
    ],
    "Жумабеков А.Т.": [
        {"label": "ХОБЛ", "variant": DiseaseTagVariant.yellow},
    ],
    "Садыков Е.Н.": [
        {"label": "ИБС", "variant": DiseaseTagVariant.red},
    ],
}

PATIENT_ALLERGIES_DATA: dict[str, list[str]] = {
    "Ахметова А.С.": ["Пенициллин", "Аспирин"],
    "Касымова Г.Р.": ["Лактоза"],
    "Садыков Е.Н.": ["Пыльца"],
}

HOSPITALIZATIONS_DATA = {
    "Касымова Г.Р.": {
        "department": "Терапевтическое отделение",
        "ward": "Палата 214",
        "bed": "Койка 3",
        "admitted_at": date(2026, 5, 22),
        "primary_diagnosis": "J45.0 Бронхиальная астма",
    },
    "Садыков Е.Н.": {
        "department": "Терапевтическое отделение",
        "ward": "Палата 208",
        "bed": "Койка 1",
        "admitted_at": date(2026, 5, 26),
        "primary_diagnosis": "J30.1 Аллергический ринит",
    },
}

# Прививки — вкладка «Прививки» (mock-data: patientId "1" = Ахметова А.С.)
VACCINATIONS_DATA: dict[str, list[dict]] = {
    "Ахметова А.С.": [
        {
            "name": "Грипп (сезонная)",
            "date": date(2026, 3, 15),
            "dose": "Гриппол Плюс, серия ГФ-2025-01",
            "notes": "Без реакций",
        },
        {
            "name": "Пневмококк",
            "date": date(2024, 9, 12),
            "dose": "Пневмовакс 23, серия ПВ-1022",
            "notes": None,
        },
        {
            "name": "COVID-19 (бустер)",
            "date": date(2022, 4, 5),
            "dose": "QazVac, серия QV-0391",
            "notes": "Лёгкая местная реакция",
        },
    ],
}
SCHEDULES_DATA = [
    {"day_id": "mon", "label": "Понедельник", "enabled": True,  "start": "08:00", "end": "14:00"},
    {"day_id": "tue", "label": "Вторник",     "enabled": True,  "start": "08:00", "end": "14:00"},
    {"day_id": "wed", "label": "Среда",       "enabled": True,  "start": "08:00", "end": "14:00"},
    {"day_id": "thu", "label": "Четверг",     "enabled": True,  "start": "08:00", "end": "14:00"},
    {"day_id": "fri", "label": "Пятница",     "enabled": True,  "start": "08:00", "end": "14:00"},
    {"day_id": "sat", "label": "Суббота",     "enabled": False, "start": "08:00", "end": "14:00"},
    {"day_id": "sun", "label": "Воскресенье", "enabled": False, "start": "08:00", "end": "14:00"},
]
HEALTH_METRICS_DATA: dict[str, list[dict]] = {
    "Ахметова А.С.": [
        {"label": "Рост", "value": "168 см", "date": date(2026, 5, 20), "note": None},
        {"label": "Вес", "value": "82 кг", "date": date(2026, 5, 20), "note": None},
        {"label": "ИМТ", "value": "29.1", "date": date(2026, 5, 20), "note": "избыточный"},
        {"label": "АД (систол.)", "value": "148 мм рт.ст.", "date": date(2026, 5, 20), "note": None},
        {"label": "АД (диастол.)", "value": "92 мм рт.ст.", "date": date(2026, 5, 20), "note": None},
        {"label": "ЧСС", "value": "78 уд/мин", "date": date(2026, 5, 20), "note": None},
        {"label": "Сатурация", "value": "97%", "date": date(2026, 5, 20), "note": None},
        {"label": "Глюкоза крови", "value": "5.6 ммоль/л", "date": date(2026, 7, 10), "note": None},
        {"label": "Холестерин", "value": "5.8 ммоль/л", "date": date(2026, 7, 10), "note": None},
    ],
}
DEPARTMENT_DATA = {"name": "Эндокринологическое отделение"}

DOCTOR_PROFILE_EXTRA = {
    "title": "Врач-эндокринолог",
    "office": "Кабинет 214",
    "phone": "+7 (701) 234-56-78",
    "email": "sharipov@poliklinika12.kz",
    "workplace": "Городская поликлиника №12, г. Астана, ул. Туран 24",
    "specialty": "Эндокринолог (04.02.001)",
    "qualification_category": "Высшая",
    "license_number": "0023847-МД",
    "license_valid_until": "31.12.2027",
    "about": "Врач-эндокринолог с 14-летним стажем...",
    "experience_years": 14,
}

USER_DATA = {
    "email": "sharipov@poliklinika12.kz",
    "full_name": "Шарипов Муслим Юнусалиевич",
    "role": UserRole.doctor,
}

def _is_placeholder_iin(iin: str) -> bool:
    return iin.startswith("0000000000")


def _get_or_create_patient(db, short_name: str) -> Patient:
    patient = db.query(Patient).filter(Patient.short_name == short_name).first()
    fields = PATIENTS_DATA[short_name]

    if patient is None:
        patient = Patient(**fields)
        db.add(patient)
        db.flush()
        return patient

    if _is_placeholder_iin(patient.iin):
        for key, value in fields.items():
            setattr(patient, key, value)

    return patient


def _get_or_create_appointment(db, doctor, patient, today: date, item: dict) -> Appointment:
    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient.id,
            Appointment.date == today,
            Appointment.time == item["time"],
        )
        .first()
    )

    fields = {
        "complaint": item["complaint"],
        "status": item["status"],
        "diagnosis_code": item["diagnosis_code"],
        "diagnosis_name": item["diagnosis_name"],
        "objective_status": item["objective_status"],
    }

    if appointment is None:
        appointment = Appointment(
            date=today,
            time=item["time"],
            patient_id=patient.id,
            doctor_id=doctor.id,
            **fields,
        )
        db.add(appointment)
        db.flush()
        return appointment

    for key, value in fields.items():
        setattr(appointment, key, value)

    return appointment


def _sync_patient_diseases(db, patient: Patient) -> None:
    items = PATIENT_DISEASES_DATA.get(patient.short_name, [])

    for disease in list(patient.diseases):
        db.delete(disease)
    db.flush()

    for item in items:
        db.add(PatientDisease(patient_id=patient.id, **item))

def _sync_patient_allergies(db, patient: Patient) -> None:
    names = PATIENT_ALLERGIES_DATA.get(patient.short_name, [])
    for allergy in list(patient.allergies):
        db.delete(allergy)
    db.flush()
    for name in names:
        db.add(PatientAllergy(patient_id=patient.id, name=name))


def _sync_hospitalizations(db, doctor, patient: Patient) -> None:
    item = HOSPITALIZATIONS_DATA.get(patient.short_name)

    for hospitalization in list(patient.hospitalizations):
        db.delete(hospitalization)
    db.flush()

    if item is not None:
        db.add(Hospitalization(patient_id=patient.id, doctor_id=doctor.id, **item))


def _sync_vaccinations(db, patient: Patient) -> None:
    items = VACCINATIONS_DATA.get(patient.short_name, [])

    for vaccination in list(patient.vaccinations):
        db.delete(vaccination)
    db.flush()

    for item in items:
        db.add(Vaccination(patient_id=patient.id, **item))

def _sync_schedules(db, doctor) -> None:
    for row in list(doctor.schedules):
        db.delete(row)
    db.flush()
    for item in SCHEDULES_DATA:
        db.add(Schedule(doctor_id=doctor.id, **item))
def _sync_health_metrics(db, patient: Patient) -> None:
    items = HEALTH_METRICS_DATA.get(patient.short_name, [])
    for metric in list(patient.health_metrics):
        db.delete(metric)
    db.flush()
    for item in items:
        db.add(HealthMetric(patient_id=patient.id, **item))


def _get_or_create_department(db) -> Department:
    department = db.query(Department).first()
    if department is None:
        department = Department(**DEPARTMENT_DATA)
        db.add(department)
        db.flush()
    return department


def _get_or_create_doctor(db, department: Department) -> Doctor:
    doctor = db.query(Doctor).first()
    fields = {**DOCTOR_DATA, **DOCTOR_PROFILE_EXTRA, "department_id": department.id}

    if doctor is None:
        doctor = Doctor(**fields)
        db.add(doctor)
        db.flush()
        return doctor

    for key, value in fields.items():
        setattr(doctor, key, value)
    return doctor


def _sync_user(db, doctor: Doctor) -> None:
    user = db.query(User).filter(User.email == USER_DATA["email"]).first()
    if user is None:
        db.add(User(**USER_DATA, doctor_id=doctor.id))
        return

    user.full_name = USER_DATA["full_name"]
    user.role = USER_DATA["role"]
    user.doctor_id = doctor.id


def seed() -> None:
    db = SessionLocal()
    try:
        department = _get_or_create_department(db)
        doctor = _get_or_create_doctor(db, department)
        _sync_user(db, doctor)
        _sync_schedules(db, doctor)

        patients_by_name: dict[str, Patient] = {}
        today = date.today()

        for item in APPOINTMENTS_DATA:
            patient_name = item["patient"]
            patient = _get_or_create_patient(db, patient_name)
            patients_by_name[patient_name] = patient
            _sync_patient_diseases(db, patient)
            _get_or_create_appointment(db, doctor, patient, today, item)
            _sync_patient_allergies(db, patient)
            _sync_hospitalizations(db, doctor, patient)
            _sync_vaccinations(db, patient)
            _sync_health_metrics(db, patient)

        db.commit()
        print(f"Готово: 1 врач, {len(patients_by_name)} пациентов, {len(APPOINTMENTS_DATA)} приёмов.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
