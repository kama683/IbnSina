from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_employee, require_roles
from app.models.cash_shift import CashShift, CashShiftStatus
from app.models.employee import Employee, EmployeeRole
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
    shift.closed_at = datetime.utcnow()
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
