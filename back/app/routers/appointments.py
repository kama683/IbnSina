from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import require_roles
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor_profile import DoctorProfile
from app.models.employee import Employee, EmployeeRole, EmployeeStatus
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.schedule import Schedule
from app.schemas.appointment import AppointmentCreateIn, AppointmentUpdateIn

router = APIRouter()

# Роли по матрице §2.2 плана (docs/PHASE0_ANALYSIS.md), см. отчёт по коммиту 6:
# кто видит расписание/очередь приёмов (не финансы, не склад).
_VIEW_SCHEDULE = require_roles(
    EmployeeRole.reception, EmployeeRole.doctor, EmployeeRole.nurse, EmployeeRole.head_doctor
)
# Управленческая статистика — доктор/главврач.
_VIEW_STATS = require_roles(EmployeeRole.doctor, EmployeeRole.head_doctor)
# Этап 1, коммит 3 (docs/PHASE1_ANALYSIS.md §6 п.6) — многодокторская запись:
# employeeId теперь выбирается в теле запроса, поэтому reception снят с
# исключения из Этапа 0 (там сама причина исключения была «нет выбора врача»,
# см. историю коммита e6f7a8b9c0d1/f7a8b9c0d1e2). Роль не ограничивает, КОМУ
# именно можно записать — это делает _get_bookable_employee_or_404 ниже
# (только активные с doctor_profile), одинаково для всех трёх ролей. Те же
# роли — у превью доступных слотов (коммит 4, решение C §6.1): это те, кто
# вообще может записывать на приём, а не отдельная категория прав.
_MULTI_DOCTOR_BOOKING = require_roles(
    EmployeeRole.reception, EmployeeRole.doctor, EmployeeRole.head_doctor
)
# Осмотр/диагноз/назначения — только тот, кто ведёт приём.
_MANAGE_EXAMINATION = require_roles(EmployeeRole.doctor, EmployeeRole.head_doctor)

_APPOINTMENT_LOAD_OPTIONS = (
    joinedload(Appointment.patient),
    joinedload(Appointment.employee),
    joinedload(Appointment.created_by),
)

_WEEKDAY_TO_DAY_ID = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _get_bookable_employee_or_404(db: Session, employee_id: int) -> Employee:
    """Тот же критерий "кого можно выбрать врачом", что и в
    GET /api/employees?role=doctor (решение A, §6.1 плана) — активный
    сотрудник с doctor_profile. Не полагаемся на клиента: employeeId в теле
    запроса мог прийти откуда угодно, значение всегда перепроверяется тут."""
    employee = (
        db.query(Employee)
        .join(DoctorProfile, DoctorProfile.employee_id == Employee.id)
        .filter(Employee.id == employee_id, Employee.status == EmployeeStatus.active)
        .first()
    )
    if employee is None:
        raise HTTPException(status_code=404, detail="Врач не найден")
    return employee


def _get_enabled_schedule_for_date(db: Session, employee_id: int, appt_date: date) -> Schedule | None:
    day_id = _WEEKDAY_TO_DAY_ID[appt_date.weekday()]
    schedule = (
        db.query(Schedule)
        .filter(Schedule.employee_id == employee_id, Schedule.day_id == day_id)
        .first()
    )
    return schedule if schedule is not None and schedule.enabled else None


def _assert_within_working_hours(db: Session, employee_id: int, appt_date: date, time: str) -> None:
    """Жёсткий reject вне графика (§6 п.6) — сравниваем "HH:MM" как строки,
    при одинаковой длине это эквивалентно сравнению времени. Источник
    истины общий с GET /available-slots (_get_enabled_schedule_for_date) —
    коммит 4 не должен позволить предложить слот, который потом даст 400
    при создании (решение C, §6.1)."""
    schedule = _get_enabled_schedule_for_date(db, employee_id, appt_date)
    if schedule is None:
        raise HTTPException(status_code=400, detail="Врач не принимает в этот день недели")
    if not (schedule.start <= time < schedule.end):
        raise HTTPException(
            status_code=400,
            detail=f"Время вне рабочих часов врача ({schedule.start}–{schedule.end})",
        )


def _generate_time_grid(start: str, end: str, step_minutes: int = 30) -> list[str]:
    start_h, start_m = (int(part) for part in start.split(":"))
    end_h, end_m = (int(part) for part in end.split(":"))
    current = start_h * 60 + start_m
    end_total = end_h * 60 + end_m

    slots = []
    while current < end_total:
        slots.append(f"{current // 60:02d}:{current % 60:02d}")
        current += step_minutes
    return slots

MONTHS_GENITIVE = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
]


def _week_bounds(base: date | None = None) -> tuple[date, date]:
    today = base or date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=5)
    return week_start, week_end


def _format_week_period(week_start: date, week_end: date) -> str:
    if week_start.month == week_end.month:
        return (
            f"{week_start.day}–{week_end.day} "
            f"{MONTHS_GENITIVE[week_start.month - 1]} {week_start.year}"
        )
    return (
        f"{week_start.day} {MONTHS_GENITIVE[week_start.month - 1]} – "
        f"{week_end.day} {MONTHS_GENITIVE[week_end.month - 1]} {week_end.year}"
    )


def _serialize_appointment(appointment: Appointment) -> dict:
    return {
        "id": str(appointment.id),
        "patientId": str(appointment.patient_id),
        "employeeId": str(appointment.employee_id),
        "date": appointment.date.strftime("%d.%m.%Y"),
        "time": appointment.time,
        "patient": appointment.patient.short_name,
        "complaint": appointment.complaint,
        "diagnosis": appointment.diagnosis,
        "doctor": appointment.employee.short_name,
        "createdBy": appointment.created_by.short_name if appointment.created_by else None,
        "status": appointment.status.value,
    }


def _query_appointments(db: Session, from_date: date, to_date: date) -> list[Appointment]:
    return (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(Appointment.date >= from_date, Appointment.date <= to_date)
        .order_by(Appointment.date, Appointment.time)
        .all()
    )


@router.get("", dependencies=[Depends(_VIEW_SCHEDULE)])
def list_appointments(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    rows = _query_appointments(db, from_date, to_date)
    return [_serialize_appointment(row) for row in rows]


@router.get("/week", dependencies=[Depends(_VIEW_SCHEDULE)])
def get_week_appointments(db: Session = Depends(get_db)):
    week_start, week_end = _week_bounds()
    rows = _query_appointments(db, week_start, week_end)
    return [_serialize_appointment(row) for row in rows]


@router.get("/stats/week", dependencies=[Depends(_VIEW_STATS)])
def get_week_stats(db: Session = Depends(get_db)):
    week_start, week_end = _week_bounds()

    week_appointments = _query_appointments(db, week_start, week_end)
    total = len(week_appointments)
    completed = sum(
        1 for row in week_appointments if row.status == AppointmentStatus.completed
    )
    cancelled = sum(
        1 for row in week_appointments if row.status == AppointmentStatus.cancelled
    )

    first_visit_subq = (
        db.query(
            Appointment.patient_id.label("patient_id"),
            func.min(Appointment.date).label("first_date"),
        )
        .group_by(Appointment.patient_id)
        .subquery()
    )
    new_patients = (
        db.query(first_visit_subq.c.patient_id)
        .filter(
            first_visit_subq.c.first_date >= week_start,
            first_visit_subq.c.first_date <= week_end,
        )
        .count()
    )

    dispensary = (
        db.query(Appointment)
        .join(Patient, Appointment.patient_id == Patient.id)
        .filter(
            Appointment.date >= week_start,
            Appointment.date <= week_end,
            Patient.dispensary.is_(True),
            Appointment.status != AppointmentStatus.cancelled,
        )
        .count()
    )

    completed_durations = [
        row.duration_minutes
        for row in week_appointments
        if row.status == AppointmentStatus.completed and row.duration_minutes
    ]
    avg_minutes = (
        round(sum(completed_durations) / len(completed_durations))
        if completed_durations
        else 0
    )

    return {
        "period": _format_week_period(week_start, week_end),
        "total": total,
        "completed": completed,
        "cancelled": cancelled,
        "newPatients": new_patients,
        "dispensary": dispensary,
        "avgMinutes": avg_minutes,
    }


@router.get("/queue", dependencies=[Depends(_VIEW_SCHEDULE)])
def get_queue_appointments(db: Session = Depends(get_db)):
    today = date.today()
    rows = (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(
            Appointment.date == today,
            Appointment.status.in_(
                [AppointmentStatus.scheduled, AppointmentStatus.in_progress]
            ),
        )
        .order_by(Appointment.time)
        .all()
    )
    return [_serialize_appointment(row) for row in rows]


@router.get("/today", dependencies=[Depends(_VIEW_SCHEDULE)])
def get_today_appointments(db: Session = Depends(get_db)):
    today = date.today()
    rows = (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(Appointment.date == today)
        .order_by(Appointment.time)
        .all()
    )
    return [_serialize_appointment(row) for row in rows]


@router.get("/current", dependencies=[Depends(_VIEW_SCHEDULE)])
def get_current_appointment(db: Session = Depends(get_db)):
    today = date.today()
    row = (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(
            Appointment.date == today,
            Appointment.status == AppointmentStatus.in_progress,
        )
        .first()
    )
    if not row:
        return None
    return _serialize_appointment(row)


@router.get("/available-slots", dependencies=[Depends(_MULTI_DOCTOR_BOOKING)])
def get_available_slots(
    employee_id: int = Query(..., alias="employeeId"),
    target_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    """Превью для формы записи (§6 п.6, решение C) — не источник истины:
    POST /appointments всё равно пересчитывает и проверяет сам
    (_assert_within_working_hours + конфликт-чек), клиенту не доверяем.
    Занятые слоты — активные (не cancelled) приёмы на эту дату/врача, чтобы
    отменённый приём освобождал слот."""
    _get_bookable_employee_or_404(db, employee_id)

    schedule = _get_enabled_schedule_for_date(db, employee_id, target_date)
    if schedule is None:
        return []

    all_slots = _generate_time_grid(schedule.start, schedule.end)
    booked = {
        row.time
        for row in db.query(Appointment.time).filter(
            Appointment.employee_id == employee_id,
            Appointment.date == target_date,
            Appointment.status != AppointmentStatus.cancelled,
        )
    }
    return [slot for slot in all_slots if slot not in booked]


@router.post("")
def create_appointment(
    payload: AppointmentCreateIn,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(_MULTI_DOCTOR_BOOKING),
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")

    target_employee = _get_bookable_employee_or_404(db, payload.employee_id)
    _assert_within_working_hours(db, target_employee.id, payload.date, payload.time)

    conflict = (
        db.query(Appointment)
        .filter(
            Appointment.employee_id == target_employee.id,
            Appointment.date == payload.date,
            Appointment.time == payload.time,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail="На это время уже есть приём")

    appointment = Appointment(
        date=payload.date,
        time=payload.time,
        complaint=payload.complaint,
        status=AppointmentStatus.scheduled,
        patient_id=payload.patient_id,
        employee_id=target_employee.id,
        created_by_id=current_employee.id,
    )
    db.add(appointment)
    db.commit()

    appointment = (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(Appointment.id == appointment.id)
        .first()
    )
    return _serialize_appointment(appointment)


def _sync_prescriptions(
    db: Session,
    appointment: Appointment,
    prescriptions: list,
) -> None:
    for existing in list(appointment.prescriptions):
        db.delete(existing)

    for item in prescriptions:
        if not item.medication.strip():
            continue
        db.add(
            Prescription(
                appointment_id=appointment.id,
                medication=item.medication,
                dosage=item.dosage,
                frequency=item.duration,
            )
        )


@router.patch("/{appointment_id}", dependencies=[Depends(_MANAGE_EXAMINATION)])
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdateIn,
    db: Session = Depends(get_db),
):
    appointment = (
        db.query(Appointment)
        .options(joinedload(Appointment.prescriptions))
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Приём не найден")

    if payload.complaints is not None:
        appointment.complaint = payload.complaints

    if payload.objective_status is not None:
        appointment.objective_status = payload.objective_status

    if payload.diagnoses is not None:
        if payload.diagnoses:
            primary = payload.diagnoses[0]
            appointment.diagnosis_code = primary.code or None
            appointment.diagnosis_name = primary.name or None
        else:
            appointment.diagnosis_code = None
            appointment.diagnosis_name = None

    if payload.prescriptions is not None:
        _sync_prescriptions(db, appointment, payload.prescriptions)

    if payload.status is not None:
        if payload.status == AppointmentStatus.in_progress:
            db.query(Appointment).filter(
                Appointment.employee_id == appointment.employee_id,
                Appointment.date == appointment.date,
                Appointment.status == AppointmentStatus.in_progress,
                Appointment.id != appointment.id,
            ).update(
                {Appointment.status: AppointmentStatus.scheduled},
                synchronize_session=False,
            )
        appointment.status = payload.status
        if payload.status == AppointmentStatus.completed and appointment.duration_minutes is None:
            appointment.duration_minutes = payload.duration_minutes or 18

    if payload.duration_minutes is not None:
        appointment.duration_minutes = payload.duration_minutes

    db.commit()

    appointment = (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(Appointment.id == appointment_id)
        .first()
    )
    return _serialize_appointment(appointment)
