from datetime import date, datetime, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_employee, require_roles
from app.models.appointment import Appointment, AppointmentStatus
from app.models.cash_shift import CashShift, CashShiftStatus
from app.models.employee import Employee, EmployeeRole
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentMethod
from app.routers.cash_shifts import shift_payments
from app.routers.invoices import _INVOICE_LOAD_OPTIONS, discount_awaits_approval, paid_amounts

router = APIRouter()

# Этап 2, коммит 5 (docs/PHASE2_ANALYSIS.md, решение 5) — дневной отчёт по
# всей клинике только head_doctor; reception видит только свою смену
# (app/routers/cash_shifts.py::get_shift_report).
_VIEW_DAILY_REPORT = require_roles(EmployeeRole.head_doctor)
# Сводка рабочего места регистратуры — те же роли, что у кассы/счетов.
_RECEPTION_SUMMARY = require_roles(EmployeeRole.reception, EmployeeRole.head_doctor)

_AWAITING_LIST_LIMIT = 8


@router.get("/daily", dependencies=[Depends(_VIEW_DAILY_REPORT)])
def get_daily_report(
    report_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    start = datetime.combine(report_date, time.min)
    end = datetime.combine(report_date, time.max)

    payments = (
        db.query(Payment).filter(Payment.created_at >= start, Payment.created_at <= end).all()
    )

    cash_total = sum(p.amount for p in payments if p.method == PaymentMethod.cash)
    card_total = sum(p.amount for p in payments if p.method == PaymentMethod.card)
    transfer_total = sum(p.amount for p in payments if p.method == PaymentMethod.transfer)
    refunds_total = sum(-p.amount for p in payments if p.amount < 0)

    invoices_touched = {p.invoice_id for p in payments}

    return {
        "date": report_date.isoformat(),
        "cashTotal": cash_total,
        "cardTotal": card_total,
        "transferTotal": transfer_total,
        "total": cash_total + card_total + transfer_total,
        "refundsTotal": refunds_total,
        "paymentsCount": len(payments),
        "invoicesTouchedCount": len(invoices_touched),
    }


@router.get("/reception-summary", dependencies=[Depends(_RECEPTION_SUMMARY)])
def get_reception_summary(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    """Всё для экрана «Стойка регистратуры» одним запросом (вместо очереди,
    счетов, смены и отчёта смены отдельными вызовами с фронта).

    * shift — открытая смена ТЕКУЩЕГО сотрудника и принято за неё (все способы
      оплаты, возвраты вычтены; считается так же, как отчёт смены);
    * queue/doctors — приёмы на сегодня: ждут (scheduled), на приёме
      (in_progress), по врачам с кабинетом;
    * invoices — счета unpaid/partial и черновики, у которых скидка выше
      порога ждёт подтверждения главврача (выставить такой счёт бэкенд не даст,
      поэтому «ждёт главврача» бывает только у черновика)."""
    today = date.today()

    shift = (
        db.query(CashShift)
        .filter(
            CashShift.cashier_employee_id == current_employee.id,
            CashShift.status == CashShiftStatus.open,
        )
        .first()
    )
    shift_info = None
    if shift is not None:
        shift_info = {
            "id": shift.id,
            "openedAt": shift.opened_at.isoformat(),
            "receivedTotal": sum(p.amount for p in shift_payments(db, shift)),
        }

    appointments = (
        db.query(Appointment)
        .options(joinedload(Appointment.employee).joinedload(Employee.doctor_profile))
        .filter(Appointment.date == today, Appointment.status != AppointmentStatus.cancelled)
        .all()
    )
    waiting = sum(1 for a in appointments if a.status == AppointmentStatus.scheduled)
    in_progress = sum(1 for a in appointments if a.status == AppointmentStatus.in_progress)

    by_doctor: dict[int, dict] = {}
    for appointment in appointments:
        doctor = appointment.employee
        row = by_doctor.setdefault(
            doctor.id,
            {
                "employeeId": doctor.id,
                "shortName": doctor.short_name,
                "office": (doctor.doctor_profile.office if doctor.doctor_profile else None) or "",
                "inProgress": False,
                "waiting": 0,
            },
        )
        if appointment.status == AppointmentStatus.in_progress:
            row["inProgress"] = True
        elif appointment.status == AppointmentStatus.scheduled:
            row["waiting"] += 1
    doctors = sorted(
        by_doctor.values(), key=lambda r: (not r["inProgress"], -r["waiting"], r["shortName"])
    )

    unpaid_count = (
        db.query(Invoice)
        .filter(Invoice.status.in_([InvoiceStatus.unpaid, InvoiceStatus.partial]))
        .count()
    )
    drafts = (
        db.query(Invoice)
        .options(joinedload(Invoice.patient), *_INVOICE_LOAD_OPTIONS)
        .filter(Invoice.status == InvoiceStatus.draft, Invoice.discount_approved_by_id.is_(None))
        .order_by(Invoice.created_at.desc())
        .all()
    )
    awaiting_approval = [invoice for invoice in drafts if discount_awaits_approval(invoice)]
    unpaid = (
        db.query(Invoice)
        .options(joinedload(Invoice.patient))
        .filter(Invoice.status.in_([InvoiceStatus.unpaid, InvoiceStatus.partial]))
        .order_by(Invoice.created_at.desc(), Invoice.id.desc())
        .limit(_AWAITING_LIST_LIMIT)
        .all()
    )
    shown = (awaiting_approval[:3] + unpaid)[:_AWAITING_LIST_LIMIT]
    paid = paid_amounts(db, [invoice.id for invoice in shown])

    return {
        "date": today.isoformat(),
        "shift": shift_info,
        "queue": {"waiting": waiting, "inProgress": in_progress},
        "doctors": doctors,
        "invoices": {
            "unpaidCount": unpaid_count,
            "awaitingApprovalCount": len(awaiting_approval),
            "awaitingPayment": [
                {
                    "id": invoice.id,
                    "number": invoice.invoice_number,
                    "patientId": invoice.patient_id,
                    "patientName": invoice.patient.short_name if invoice.patient else None,
                    "total": invoice.total,
                    "paidAmount": paid.get(invoice.id, 0),
                    "status": invoice.status.value,
                    "awaitingApproval": invoice.status == InvoiceStatus.draft,
                }
                for invoice in shown
            ],
        },
    }
