from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_employee, require_roles
from app.models.appointment import Appointment, AppointmentStatus, CancellationReasonCode
from app.models.doctor_profile import DoctorProfile
from app.models.employee import Employee, EmployeeRole, EmployeeStatus
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.schedule import Schedule
from app.routers.cash_shifts import _db_now
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
# Этап 1, коммит 5 (docs/PHASE1_ANALYSIS.md §6 п.3, решение B §6.1) — PATCH
# /{appointment_id} обслуживает три разных действия (осмотр, отмена, перенос)
# с разной матрицей прав. Route-level guard ниже — ОБЪЕДИНЕНИЕ всех ролей,
# кому вообще может быть позволено что-то из трёх (иначе default-deny-тест
# увидит маршрут как "голый", см. риск §6.5 Этапа 0); какое именно действие
# пришло и кому конкретно оно разрешено — проверяется в теле хендлера.
_MANAGE_APPOINTMENT = require_roles(
    EmployeeRole.reception, EmployeeRole.doctor, EmployeeRole.head_doctor
)

# Завершение без completed_at (старые строки): считаем от started_at, длительность
# по умолчанию — 18 минут.
_DEFAULT_DURATION_MINUTES = 18

_APPOINTMENT_LOAD_OPTIONS = (
    joinedload(Appointment.patient),
    joinedload(Appointment.employee).joinedload(Employee.doctor_profile),
    joinedload(Appointment.created_by),
    joinedload(Appointment.cancelled_by),
)

# Порядок приёмов: по дате, затем по врачу и номеру в его очереди.
_QUEUE_ORDER = (Appointment.date, Appointment.employee_id, Appointment.queue_number)

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


def _assert_works_that_day(db: Session, employee_id: int, appt_date: date) -> None:
    """Запись только на день, когда врач принимает по графику (время приёма не
    назначается, поэтому часы работы не проверяются)."""
    if _get_enabled_schedule_for_date(db, employee_id, appt_date) is None:
        raise HTTPException(status_code=400, detail="Врач не принимает в этот день недели")


def _next_queue_number(db: Session, employee_id: int, appt_date: date) -> int:
    """Следующий номер пациента у врача на день. Врача блокируем на время
    транзакции, чтобы два одновременных создания не получили один номер.
    Отменённые приёмы номер сохраняют, поэтому он никогда не переиспользуется."""
    db.query(Employee.id).filter(Employee.id == employee_id).with_for_update().first()
    last = (
        db.query(func.max(Appointment.queue_number))
        .filter(Appointment.employee_id == employee_id, Appointment.date == appt_date)
        .scalar()
    )
    return (last or 0) + 1


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
        "queueNumber": appointment.queue_number,
        "patient": appointment.patient.short_name,
        "complaint": appointment.complaint,
        "diagnosis": appointment.diagnosis,
        "doctor": appointment.employee.short_name,
        "createdBy": appointment.created_by.short_name if appointment.created_by else None,
        "status": appointment.status.value,
        "cancelledAt": appointment.cancelled_at.isoformat() if appointment.cancelled_at else None,
        "cancelledBy": appointment.cancelled_by.short_name if appointment.cancelled_by else None,
        "cancellationReason": appointment.cancellation_reason,
        "cancellationReasonCode": (
            appointment.cancellation_reason_code.value
            if appointment.cancellation_reason_code
            else None
        ),
        "office": (
            appointment.employee.doctor_profile.office
            if appointment.employee.doctor_profile
            else None
        ) or "",
        "startedAt": appointment.started_at.isoformat() if appointment.started_at else None,
        "completedAt": appointment.completed_at.isoformat() if appointment.completed_at else None,
    }


def _only_own_for_doctor(query, employee: Employee):
    """Врач видит в приёмах только своих пациентов; главврач, регистратор и
    медсестра — все приёмы клиники."""
    if employee.role == EmployeeRole.doctor:
        return query.filter(Appointment.employee_id == employee.id)
    return query


def _query_appointments(
    db: Session, from_date: date, to_date: date, employee: Employee
) -> list[Appointment]:
    query = (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(Appointment.date >= from_date, Appointment.date <= to_date)
    )
    return _only_own_for_doctor(query, employee).order_by(*_QUEUE_ORDER).all()


def _parse_status_filter(values: list[str] | None) -> list[AppointmentStatus] | None:
    """?status=scheduled,in_progress и ?status=scheduled&status=in_progress."""
    if not values:
        return None
    parsed: list[AppointmentStatus] = []
    for raw in values:
        for part in raw.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                parsed.append(AppointmentStatus(part))
            except ValueError:
                raise HTTPException(status_code=422, detail=f"Неизвестный статус приёма: {part}")
    return parsed or None


def _effective_completion(appointment: Appointment) -> datetime:
    if appointment.completed_at is not None:
        return appointment.completed_at
    if appointment.started_at is not None:
        return appointment.started_at + timedelta(
            minutes=appointment.duration_minutes or _DEFAULT_DURATION_MINUTES
        )
    return datetime.combine(appointment.date, time.min)


@router.get("", dependencies=[Depends(_VIEW_SCHEDULE)])
def list_appointments(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    patient_id: int | None = Query(None, alias="patientId"),
    status_filter: list[str] | None = Query(None, alias="status"),
    completed_within: int | None = Query(
        None, alias="completedWithin", ge=1, le=24 * 60,
        description="завершённые за последние N минут (по часам БД), новые первыми",
    ),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    """Приёмы по периоду (from/to), пациенту (patientId), статусам (status,
    несколько значений) или «завершены за последние N минут» (completedWithin).
    Нужен хотя бы один из: период, patientId, completedWithin — весь журнал
    клиники этим эндпоинтом не отдаём."""
    if from_date is None and to_date is None and patient_id is None and completed_within is None:
        raise HTTPException(
            status_code=422, detail="Укажите период (from/to), patientId или completedWithin"
        )
    statuses = _parse_status_filter(status_filter)

    if completed_within is not None:
        now = _db_now(db).replace(tzinfo=None)
        since = now - timedelta(minutes=completed_within)
        rows = _only_own_for_doctor(
            db.query(Appointment)
            .options(*_APPOINTMENT_LOAD_OPTIONS)
            .filter(
                Appointment.status == AppointmentStatus.completed,
                # завершённый за окно не мог начаться раньше чем за сутки
                Appointment.date >= (since - timedelta(days=1)).date(),
            ),
            current_employee,
        ).all()
        if patient_id is not None:
            rows = [row for row in rows if row.patient_id == patient_id]
        rows = [row for row in rows if _effective_completion(row) >= since]
        rows.sort(key=_effective_completion, reverse=True)
        return [_serialize_appointment(row) for row in rows]

    query = _only_own_for_doctor(
        db.query(Appointment).options(*_APPOINTMENT_LOAD_OPTIONS), current_employee
    )
    if from_date is not None:
        query = query.filter(Appointment.date >= from_date)
    if to_date is not None:
        query = query.filter(Appointment.date <= to_date)
    if patient_id is not None:
        query = query.filter(Appointment.patient_id == patient_id)
    if statuses:
        query = query.filter(Appointment.status.in_(statuses))
    rows = query.order_by(*_QUEUE_ORDER).all()
    return [_serialize_appointment(row) for row in rows]


@router.get("/week", dependencies=[Depends(_VIEW_SCHEDULE)])
def get_week_appointments(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    week_start, week_end = _week_bounds()
    rows = _query_appointments(db, week_start, week_end, current_employee)
    return [_serialize_appointment(row) for row in rows]


@router.get("/stats/week", dependencies=[Depends(_VIEW_STATS)])
def get_week_stats(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    week_start, week_end = _week_bounds()

    week_appointments = _query_appointments(db, week_start, week_end, current_employee)
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
def get_queue_appointments(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    today = date.today()
    query = (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(
            Appointment.date == today,
            Appointment.status.in_(
                [AppointmentStatus.scheduled, AppointmentStatus.in_progress]
            ),
        )
    )
    rows = _only_own_for_doctor(query, current_employee).order_by(*_QUEUE_ORDER).all()
    return [_serialize_appointment(row) for row in rows]


@router.get("/today", dependencies=[Depends(_VIEW_SCHEDULE)])
def get_today_appointments(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    today = date.today()
    query = (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(Appointment.date == today)
    )
    rows = _only_own_for_doctor(query, current_employee).order_by(*_QUEUE_ORDER).all()
    return [_serialize_appointment(row) for row in rows]


@router.get("/current", dependencies=[Depends(_VIEW_SCHEDULE)])
def get_current_appointment(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    today = date.today()
    query = (
        db.query(Appointment)
        .options(*_APPOINTMENT_LOAD_OPTIONS)
        .filter(
            Appointment.date == today,
            Appointment.status == AppointmentStatus.in_progress,
        )
    )
    row = _only_own_for_doctor(query, current_employee).first()
    if not row:
        return None
    return _serialize_appointment(row)


@router.get("/queue-info", dependencies=[Depends(_MULTI_DOCTOR_BOOKING)])
def get_queue_info(
    employee_id: int = Query(..., alias="employeeId"),
    target_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    """Подсказка для формы записи: работает ли врач в этот день, сколько
    пациентов уже ждёт и какой номер получит новый. Не источник истины —
    номер присваивает POST /appointments."""
    _get_bookable_employee_or_404(db, employee_id)
    waiting = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.employee_id == employee_id,
            Appointment.date == target_date,
            Appointment.status.in_([AppointmentStatus.scheduled, AppointmentStatus.in_progress]),
        )
        .scalar()
    )
    last = (
        db.query(func.max(Appointment.queue_number))
        .filter(Appointment.employee_id == employee_id, Appointment.date == target_date)
        .scalar()
    )
    return {
        "works": _get_enabled_schedule_for_date(db, employee_id, target_date) is not None,
        "waiting": waiting,
        "nextNumber": (last or 0) + 1,
    }


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
    _assert_works_that_day(db, target_employee.id, payload.date)

    appointment = Appointment(
        date=payload.date,
        queue_number=_next_queue_number(db, target_employee.id, payload.date),
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


def _touches_examination_fields(payload: AppointmentUpdateIn) -> bool:
    return (
        payload.complaints is not None
        or payload.objective_status is not None
        or payload.diagnoses is not None
        or payload.prescriptions is not None
        or payload.duration_minutes is not None
        or (payload.status is not None and payload.status != AppointmentStatus.cancelled)
    )


@router.patch("/{appointment_id}", dependencies=[Depends(_MANAGE_APPOINTMENT)])
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdateIn,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    """Один эндпоинт обслуживает три действия с разной матрицей прав
    (решение B, §6.1 плана) — route-level guard (_MANAGE_APPOINTMENT) только
    пропускает "в принципе может что-то из трёх", дальше ветвимся по тому,
    какие поля реально пришли, и проверяем права на конкретное действие."""
    appointment = (
        db.query(Appointment)
        .options(joinedload(Appointment.prescriptions))
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Приём не найден")

    is_cancellation = payload.status == AppointmentStatus.cancelled
    is_reschedule = payload.date is not None or payload.employee_id is not None

    if _touches_examination_fields(payload) and current_employee.role not in (
        EmployeeRole.doctor,
        EmployeeRole.head_doctor,
    ):
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    if is_cancellation or is_reschedule:
        # Отмена/перенос: reception и head_doctor — любой приём; назначенный
        # врач — только свой (решение 3, §6).
        is_own_appointment = appointment.employee_id == current_employee.id
        allowed = (
            current_employee.role in (EmployeeRole.reception, EmployeeRole.head_doctor)
            or is_own_appointment
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="Недостаточно прав")

    if (is_cancellation or is_reschedule) and appointment.status != AppointmentStatus.scheduled:
        # Завершённый/идущий/уже отменённый приём не отменяют и не переносят.
        # Полный автомат переходов статусов — в Этапе 2 (вместе с no_show).
        raise HTTPException(
            status_code=409, detail="Отменить или перенести можно только запланированный приём"
        )

    if is_cancellation:
        code = payload.cancellation_reason_code
        if code is None:
            raise HTTPException(status_code=422, detail="Укажите причину отмены")
        reason_text = (payload.cancellation_reason or "").strip()
        if code == CancellationReasonCode.other and not reason_text:
            raise HTTPException(status_code=422, detail="Для причины «Другое» опишите её текстом")
        if len(reason_text) > 300:
            raise HTTPException(status_code=422, detail="Причина отмены — не длиннее 300 символов")

    if is_reschedule:
        target_employee_id = payload.employee_id or appointment.employee_id
        if target_employee_id != appointment.employee_id:
            # к другому врачу — только активному клиницисту (как при записи)
            _get_bookable_employee_or_404(db, target_employee_id)
        new_date = payload.date or appointment.date
        _assert_works_that_day(db, target_employee_id, new_date)
        if target_employee_id != appointment.employee_id or new_date != appointment.date:
            # другая очередь — пациент встаёт в её конец
            appointment.queue_number = _next_queue_number(db, target_employee_id, new_date)
            appointment.employee_id = target_employee_id
            appointment.date = new_date

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
        if is_cancellation:
            appointment.cancelled_at = _db_now(db).replace(tzinfo=None)
            appointment.cancelled_by_id = current_employee.id
            appointment.cancellation_reason_code = payload.cancellation_reason_code
            # текст хранится только для «Другое»: у остальных причина — сам код
            appointment.cancellation_reason = (
                (payload.cancellation_reason or "").strip()
                if payload.cancellation_reason_code == CancellationReasonCode.other
                else None
            )
        elif payload.status == AppointmentStatus.in_progress:
            db.query(Appointment).filter(
                Appointment.employee_id == appointment.employee_id,
                Appointment.date == appointment.date,
                Appointment.status == AppointmentStatus.in_progress,
                Appointment.id != appointment.id,
            ).update(
                {Appointment.status: AppointmentStatus.scheduled, Appointment.started_at: None},
                synchronize_session=False,
            )
            if appointment.status != AppointmentStatus.in_progress or appointment.started_at is None:
                appointment.started_at = _db_now(db).replace(tzinfo=None)
        appointment.status = payload.status
        if payload.status == AppointmentStatus.completed:
            if appointment.completed_at is None:
                appointment.completed_at = _db_now(db).replace(tzinfo=None)
            if appointment.duration_minutes is None:
                if payload.duration_minutes is not None:
                    appointment.duration_minutes = payload.duration_minutes
                elif appointment.started_at is not None:
                    seconds = (appointment.completed_at - appointment.started_at).total_seconds()
                    appointment.duration_minutes = max(1, round(seconds / 60))

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
