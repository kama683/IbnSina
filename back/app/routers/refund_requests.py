from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_employee, require_roles
from app.models.cash_shift import CashShift, CashShiftStatus
from app.models.employee import Employee, EmployeeRole
from app.models.payment import Payment, PaymentMethod
from app.models.refund_request import RefundRequest, RefundRequestStatus
from app.routers.invoices import _get_invoice_or_404, _recompute_invoice_status_from_payments
from app.schemas.refund_request import RefundRequestCreateIn
from app.services.audit import record_audit

router = APIRouter()

_REQUEST_REFUND = require_roles(EmployeeRole.reception, EmployeeRole.head_doctor)
_DECIDE_REFUND = require_roles(EmployeeRole.head_doctor)

_LOAD_OPTIONS = (
    joinedload(RefundRequest.requested_by),
    joinedload(RefundRequest.decided_by),
)


def serialize_refund_request(request_row: RefundRequest) -> dict:
    return {
        "id": request_row.id,
        "invoiceId": request_row.invoice_id,
        "paymentId": request_row.payment_id,
        "amount": request_row.amount,
        "reason": request_row.reason,
        "requestedBy": (
            request_row.requested_by.short_name if request_row.requested_by else None
        ),
        "status": request_row.status.value,
        "createdAt": request_row.created_at.isoformat(),
        "decidedBy": request_row.decided_by.short_name if request_row.decided_by else None,
        "decidedAt": request_row.decided_at.isoformat() if request_row.decided_at else None,
        "resultingPaymentId": request_row.resulting_payment_id,
    }


def _get_request_or_404(db: Session, request_id: int) -> RefundRequest:
    request_row = (
        db.query(RefundRequest)
        .options(*_LOAD_OPTIONS)
        .filter(RefundRequest.id == request_id)
        .first()
    )
    if request_row is None:
        raise HTTPException(status_code=404, detail="Заявка на возврат не найдена")
    return request_row


@router.get("", dependencies=[Depends(_REQUEST_REFUND)])
def list_refund_requests(
    status_filter: RefundRequestStatus | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(RefundRequest).options(*_LOAD_OPTIONS)
    if status_filter is not None:
        query = query.filter(RefundRequest.status == status_filter)
    requests = query.order_by(RefundRequest.created_at.desc()).all()
    return [serialize_refund_request(row) for row in requests]


@router.post("", dependencies=[Depends(_REQUEST_REFUND)])
def create_refund_request(
    payload: RefundRequestCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    payment = db.query(Payment).filter(Payment.id == payload.payment_id).first()
    if payment is None or payment.amount <= 0:
        raise HTTPException(status_code=404, detail="Платёж не найден")

    # Решение F (§6 плана) — частичный возврат одного платежа разрешён, но
    # сумма уже одобренных возвратов по нему плюс новый запрос не может
    # превышать исходную сумму платежа.
    already_refunded = (
        db.query(RefundRequest)
        .filter(
            RefundRequest.payment_id == payment.id,
            RefundRequest.status == RefundRequestStatus.approved,
        )
        .with_entities(RefundRequest.amount)
        .all()
    )
    refunded_so_far = sum(row[0] for row in already_refunded)
    if refunded_so_far + payload.amount > payment.amount:
        raise HTTPException(
            status_code=400, detail="Сумма возврата превышает неоплаченный остаток платежа"
        )

    refund_request = RefundRequest(
        invoice_id=payment.invoice_id,
        payment_id=payment.id,
        amount=payload.amount,
        reason=payload.reason,
        requested_by_id=current_employee.id,
        status=RefundRequestStatus.pending,
    )
    db.add(refund_request)
    db.flush()

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="refund_request",
        entity_id=refund_request.id,
        action="create",
        changes={"paymentId": payment.id, "amount": payload.amount, "reason": payload.reason},
        request=request,
    )
    db.commit()

    return serialize_refund_request(_get_request_or_404(db, refund_request.id))


@router.post("/{request_id}/approve", dependencies=[Depends(_DECIDE_REFUND)])
def approve_refund_request(
    request_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    refund_request = _get_request_or_404(db, request_id)
    if refund_request.status != RefundRequestStatus.pending:
        raise HTTPException(status_code=409, detail="Заявка уже рассмотрена")

    original_payment = (
        db.query(Payment).filter(Payment.id == refund_request.payment_id).first()
    )

    cash_shift_id = None
    if original_payment.method == PaymentMethod.cash:
        open_shift = (
            db.query(CashShift)
            .filter(
                CashShift.cashier_employee_id == current_employee.id,
                CashShift.status == CashShiftStatus.open,
            )
            .first()
        )
        if open_shift is None:
            raise HTTPException(
                status_code=409,
                detail="Нет открытой кассовой смены — откройте смену для возврата наличными",
            )
        cash_shift_id = open_shift.id

    refund_payment = Payment(
        invoice_id=refund_request.invoice_id,
        amount=-refund_request.amount,
        method=original_payment.method,
        cash_shift_id=cash_shift_id,
        created_by_id=current_employee.id,
        reversal_of_payment_id=original_payment.id,
        refund_reason=refund_request.reason,
        approved_by_id=current_employee.id,
    )
    db.add(refund_payment)
    db.flush()

    invoice = _get_invoice_or_404(db, refund_request.invoice_id)
    _recompute_invoice_status_from_payments(db, invoice)

    refund_request.status = RefundRequestStatus.approved
    refund_request.decided_by_id = current_employee.id
    refund_request.decided_at = datetime.utcnow()
    refund_request.resulting_payment_id = refund_payment.id

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="refund_request",
        entity_id=refund_request.id,
        action="approve",
        changes={"resultingPaymentId": refund_payment.id},
        request=request,
    )
    db.commit()

    return serialize_refund_request(_get_request_or_404(db, request_id))


@router.post("/{request_id}/reject", dependencies=[Depends(_DECIDE_REFUND)])
def reject_refund_request(
    request_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    refund_request = _get_request_or_404(db, request_id)
    if refund_request.status != RefundRequestStatus.pending:
        raise HTTPException(status_code=409, detail="Заявка уже рассмотрена")

    refund_request.status = RefundRequestStatus.rejected
    refund_request.decided_by_id = current_employee.id
    refund_request.decided_at = datetime.utcnow()

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="refund_request",
        entity_id=refund_request.id,
        action="reject",
        changes=None,
        request=request,
    )
    db.commit()

    return serialize_refund_request(_get_request_or_404(db, request_id))
