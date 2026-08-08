from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_employee, require_roles
from app.models.cash_shift import CashShift, CashShiftStatus
from app.models.employee import Employee, EmployeeRole
from app.models.payment import Payment, PaymentMethod
from app.schemas.cash_shift import CashShiftCloseIn, CashShiftOpenIn
from app.services.audit import record_audit

router = APIRouter()

# Этап 2, коммит 2 (docs/PHASE2_ANALYSIS.md §6, решение H) — тот же паттерн,
# что владение приёмом в Этапе 1: route-level guard — объединение ролей,
# кому вообще может быть позволено что-то со сменами; своя/чужая смена
# разбирается в хендлере.
_MANAGE_SHIFT = require_roles(EmployeeRole.reception, EmployeeRole.head_doctor)


def serialize_shift(shift: CashShift) -> dict:
    return {
        "id": shift.id,
        "cashierEmployeeId": shift.cashier_employee_id,
        "cashierName": shift.cashier.short_name if shift.cashier else None,
        "openedAt": shift.opened_at.isoformat(),
        "openingBalance": shift.opening_balance,
        "closedAt": shift.closed_at.isoformat() if shift.closed_at else None,
        "actualCash": shift.actual_cash,
        "status": shift.status.value,
    }


def _get_shift_or_404(db: Session, shift_id: int) -> CashShift:
    shift = db.query(CashShift).filter(CashShift.id == shift_id).first()
    if shift is None:
        raise HTTPException(status_code=404, detail="Смена не найдена")
    return shift


def _assert_can_manage(shift: CashShift, employee: Employee) -> None:
    is_own = shift.cashier_employee_id == employee.id
    if not (is_own or employee.role == EmployeeRole.head_doctor):
        raise HTTPException(status_code=403, detail="Недостаточно прав")


def _db_now(db: Session) -> datetime:
    """Postgres-сессия на этом сервере в другом часовом поясе (Asia/
    Qyzylorda, +5), чем Python (datetime.utcnow()). opened_at/created_at
    везде проставляются через server_default=func.now() (время БД) — если
    закрытие смены проставлять через datetime.utcnow(), закрытие окажется
    "раньше" собственных платежей смены при сравнении в отчёте (найдено
    именно на этом тесте). Берём текущее время из той же БД для
    consistency, а не чиним timezone на уровне подключения (шире по blast
    radius — задело бы уже закоммиченные Этап 0/1 миграции)."""
    return db.execute(text("SELECT now()")).scalar()


@router.post("", dependencies=[Depends(_MANAGE_SHIFT)])
def open_shift(
    payload: CashShiftOpenIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    shift = CashShift(
        cashier_employee_id=current_employee.id,
        opening_balance=payload.opening_balance,
        status=CashShiftStatus.open,
    )
    db.add(shift)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="У вас уже есть открытая смена")

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="cash_shift",
        entity_id=shift.id,
        action="open",
        changes={"openingBalance": payload.opening_balance},
        request=request,
    )
    db.commit()

    shift = _get_shift_or_404(db, shift.id)
    return serialize_shift(shift)


@router.get("/current", dependencies=[Depends(_MANAGE_SHIFT)])
def get_current_shift(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    shift = (
        db.query(CashShift)
        .filter(
            CashShift.cashier_employee_id == current_employee.id,
            CashShift.status == CashShiftStatus.open,
        )
        .first()
    )
    if shift is None:
        return None
    return serialize_shift(shift)


@router.post("/{shift_id}/close", dependencies=[Depends(_MANAGE_SHIFT)])
def close_shift(
    shift_id: int,
    payload: CashShiftCloseIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    shift = _get_shift_or_404(db, shift_id)
    _assert_can_manage(shift, current_employee)

    if shift.status != CashShiftStatus.open:
        raise HTTPException(status_code=409, detail="Смена уже закрыта")

    shift.actual_cash = payload.actual_cash
    shift.closed_at = _db_now(db)
    shift.status = CashShiftStatus.closed

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="cash_shift",
        entity_id=shift.id,
        action="close",
        changes={"actualCash": payload.actual_cash},
        request=request,
    )
    db.commit()

    shift = _get_shift_or_404(db, shift_id)
    return serialize_shift(shift)


@router.get("/{shift_id}/report", dependencies=[Depends(_MANAGE_SHIFT)])
def get_shift_report(
    shift_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    """Этап 2, коммит 5 (docs/PHASE2_ANALYSIS.md) — что принято за смену.

    expected_cash/discrepancy НЕ хранятся (см. модель) — считаются здесь из
    факта Payment. "Платежи этой смены" = созданы её кассиром в промежутке
    [opened_at; closed_at или сейчас] — так в отчёт попадают все способы
    оплаты (нал/карта/перевод), а не только те, что несут cash_shift_id
    (его физически имеют только cash-платежи, см. Payment). Это моё
    собственное техническое решение (в §6 плана явно не описано) —
    трактует "принято за смену" как "принято этим кассиром за это время",
    не только то, что подшито к смене как cash_shift_id.
    """
    shift = _get_shift_or_404(db, shift_id)
    _assert_can_manage(shift, current_employee)

    window_end = shift.closed_at or _db_now(db)
    payments = (
        db.query(Payment)
        .filter(
            Payment.created_by_id == shift.cashier_employee_id,
            Payment.created_at >= shift.opened_at,
            Payment.created_at <= window_end,
        )
        .all()
    )

    cash_total = sum(p.amount for p in payments if p.method == PaymentMethod.cash)
    card_total = sum(p.amount for p in payments if p.method == PaymentMethod.card)
    transfer_total = sum(p.amount for p in payments if p.method == PaymentMethod.transfer)
    refunds_total = sum(-p.amount for p in payments if p.amount < 0)
    expected_cash = shift.opening_balance + cash_total
    discrepancy = shift.actual_cash - expected_cash if shift.actual_cash is not None else None

    return {
        "shift": serialize_shift(shift),
        "cashTotal": cash_total,
        "cardTotal": card_total,
        "transferTotal": transfer_total,
        "refundsTotal": refunds_total,
        "paymentsCount": len(payments),
        "expectedCash": expected_cash,
        "discrepancy": discrepancy,
    }
