from datetime import date, datetime, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models.employee import EmployeeRole
from app.models.payment import Payment, PaymentMethod

router = APIRouter()

# Этап 2, коммит 5 (docs/PHASE2_ANALYSIS.md, решение 5) — дневной отчёт по
# всей клинике только head_doctor; reception видит только свою смену
# (app/routers/cash_shifts.py::get_shift_report).
_VIEW_DAILY_REPORT = require_roles(EmployeeRole.head_doctor)


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
