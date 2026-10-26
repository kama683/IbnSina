from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, text
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.deps import get_current_employee, require_roles
from app.models.appointment import Appointment
from app.models.cash_shift import CashShift, CashShiftStatus
from app.models.employee import Employee, EmployeeRole
from app.models.invoice import Invoice, InvoiceStatus
from app.models.invoice_item import InvoiceItem
from app.models.patient import Patient
from app.models.payment import Payment, PaymentMethod
from app.models.service import Service
from app.schemas.invoice import InvoiceCancelIn, InvoiceCreateIn, InvoiceItemsUpdateIn
from app.schemas.payment import PaymentCreateIn
from app.services.audit import record_audit

router = APIRouter()

# Этап 2, коммит 3 (docs/PHASE2_ANALYSIS.md) — выставляет/правит/отменяет
# счета reception, подтверждает скидку выше порога — только head_doctor.
# Доступ к самим счетам (чтение) — тот же набор, что и правка: план не
# упоминает, что doctor/nurse должны видеть счета, в отличие от расписания.
_MANAGE_INVOICE = require_roles(EmployeeRole.reception, EmployeeRole.head_doctor)
_APPROVE_DISCOUNT = require_roles(EmployeeRole.head_doctor)

_INVOICE_LOAD_OPTIONS = (
    joinedload(Invoice.created_by),
    joinedload(Invoice.discount_approved_by),
    joinedload(Invoice.cancelled_by),
    joinedload(Invoice.items).joinedload(InvoiceItem.service),
)


def serialize_invoice_item(item: InvoiceItem) -> dict:
    return {
        "id": item.id,
        "serviceId": item.service_id,
        "serviceName": item.name_snapshot,
        "priceSnapshot": item.price_snapshot,
        "quantity": item.quantity,
        "discountAmount": item.discount_amount,
        "lineTotal": item.line_total,
        "performerEmployeeId": item.performer_employee_id,
    }


def serialize_invoice(invoice: Invoice) -> dict:
    return {
        "id": invoice.id,
        "invoiceNumber": invoice.invoice_number,
        "patientId": invoice.patient_id,
        "appointmentId": invoice.appointment_id,
        "status": invoice.status.value,
        "subtotal": invoice.subtotal,
        "discountTotal": invoice.discount_total,
        "total": invoice.total,
        "discountApprovedBy": (
            invoice.discount_approved_by.short_name if invoice.discount_approved_by else None
        ),
        "discountApprovedAt": (
            invoice.discount_approved_at.isoformat() if invoice.discount_approved_at else None
        ),
        "createdBy": invoice.created_by.short_name if invoice.created_by else None,
        "createdAt": invoice.created_at.isoformat(),
        "cancelledAt": invoice.cancelled_at.isoformat() if invoice.cancelled_at else None,
        "cancelledBy": invoice.cancelled_by.short_name if invoice.cancelled_by else None,
        "cancellationReason": invoice.cancellation_reason,
        "items": [serialize_invoice_item(item) for item in invoice.items],
    }


def _get_invoice_or_404(db: Session, invoice_id: int) -> Invoice:
    invoice = (
        db.query(Invoice)
        .options(*_INVOICE_LOAD_OPTIONS)
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Счёт не найден")
    return invoice


def _generate_invoice_number(db: Session) -> str:
    """Атомарный погодовой счётчик (решение B, §6 плана) — инкремент в той
    же транзакции, что вставка Invoice, поэтому откат создания счёта
    откатывает и инкремент (номера не "горят" впустую)."""
    year = date.today().year
    result = db.execute(
        text(
            "INSERT INTO invoice_number_counters (year, last_number) "
            "VALUES (:year, 1) "
            "ON CONFLICT (year) DO UPDATE SET "
            "last_number = invoice_number_counters.last_number + 1 "
            "RETURNING last_number"
        ),
        {"year": year},
    )
    last_number = result.scalar_one()
    return f"{year}-{last_number:06d}"


def _apply_items(db: Session, invoice: Invoice, items_payload: list, discount_total: int) -> None:
    """Полная замена позиций счёта — проще и надёжнее инкрементальных add/
    remove, тот же паттерн, что _sync_prescriptions в appointments.py.
    Пересчитывает subtotal/discount_total/total сам, с клиента итоги не
    принимаются (сквозной инвариант плана)."""
    for existing in list(invoice.items):
        db.delete(existing)

    subtotal = 0
    for item_in in items_payload:
        service = (
            db.query(Service)
            .filter(Service.id == item_in.service_id, Service.is_active.is_(True))
            .first()
        )
        if service is None:
            raise HTTPException(
                status_code=404, detail=f"Активная услуга id={item_in.service_id} не найдена"
            )
        line_total = service.price * item_in.quantity - item_in.discount_amount
        if line_total < 0:
            raise HTTPException(
                status_code=400, detail="Скидка на строку не может превышать её сумму"
            )
        db.add(
            InvoiceItem(
                invoice_id=invoice.id,
                service_id=service.id,
                name_snapshot=service.name,
                price_snapshot=service.price,
                quantity=item_in.quantity,
                discount_amount=item_in.discount_amount,
                line_total=line_total,
            )
        )
        subtotal += line_total

    total = subtotal - discount_total
    if total < 0:
        raise HTTPException(status_code=400, detail="Общая скидка не может превышать сумму счёта")

    invoice.subtotal = subtotal
    invoice.discount_total = discount_total
    invoice.total = total
    # Правка позиций после одобрения скидки аннулирует старое одобрение —
    # иначе head_doctor мог одобрить одну скидку, а reception незаметно
    # увеличить её после (не было сказано явно в плане, но иначе одобрение
    # перестаёт что-либо гарантировать).
    invoice.discount_approved_by_id = None
    invoice.discount_approved_at = None


def _effective_discount_percent(invoice: Invoice) -> float:
    """Порог скидки (решение 6/7, §4 плана) считается от ПОЛНОЙ цены до
    любых скидок — и построчных, и общей — суммарно. Иначе построчные
    скидки обходили бы порог, который формально применяется только к
    discount_total."""
    full_price = sum(item.price_snapshot * item.quantity for item in invoice.items)
    if full_price == 0:
        return 0.0
    line_discounts = sum(item.discount_amount for item in invoice.items)
    total_discount = line_discounts + invoice.discount_total
    return total_discount / full_price * 100


def discount_awaits_approval(invoice: Invoice) -> bool:
    """Скидка выше порога без подтверждения главврача. Выставить такой счёт
    нельзя (issue вернёт 403), а позиции правятся только в черновике — значит,
    «ждёт главврача» бывает только у черновика."""
    return (
        invoice.status == InvoiceStatus.draft
        and invoice.discount_approved_by_id is None
        and _effective_discount_percent(invoice) > settings.default_discount_threshold_percent
    )


def paid_amounts(db: Session, invoice_ids: list[int]) -> dict[int, int]:
    """Net оплачено по счетам (возвраты — минус), одним запросом."""
    if not invoice_ids:
        return {}
    rows = (
        db.query(Payment.invoice_id, func.sum(Payment.amount))
        .filter(Payment.invoice_id.in_(invoice_ids))
        .group_by(Payment.invoice_id)
        .all()
    )
    return {invoice_id: int(total) for invoice_id, total in rows}


def _parse_status_filter(values: list[str] | None) -> list[InvoiceStatus] | None:
    """?status=unpaid,partial и ?status=unpaid&status=partial — одно и то же."""
    if not values:
        return None
    parsed: list[InvoiceStatus] = []
    for raw in values:
        for part in raw.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                parsed.append(InvoiceStatus(part))
            except ValueError:
                raise HTTPException(status_code=422, detail=f"Неизвестный статус счёта: {part}")
    return parsed or None


@router.get("", dependencies=[Depends(_MANAGE_INVOICE)])
def list_invoices(
    patient_id: int | None = Query(None, alias="patientId"),
    status_filter: list[str] | None = Query(None, alias="status"),
    appointment_ids: list[str] | None = Query(None, alias="appointmentId"),
    created_from: date | None = Query(None, alias="from"),
    created_to: date | None = Query(None, alias="to"),
    limit: int | None = Query(None, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Список счетов. Без limit отдаёт все (как раньше); для экранов с
    пагинацией клиент просит limit+1 и по лишней строке узнаёт, есть ли
    следующая страница. В строки добавлены patientName, paidAmount и
    awaitingApproval (скидка ждёт главврача)."""
    query = db.query(Invoice).options(joinedload(Invoice.patient), *_INVOICE_LOAD_OPTIONS)
    if patient_id is not None:
        query = query.filter(Invoice.patient_id == patient_id)
    statuses = _parse_status_filter(status_filter)
    if statuses:
        query = query.filter(Invoice.status.in_(statuses))
    if appointment_ids:
        try:
            wanted = [int(part) for raw in appointment_ids for part in raw.split(",") if part.strip()]
        except ValueError:
            raise HTTPException(status_code=422, detail="appointmentId — список чисел")
        query = query.filter(Invoice.appointment_id.in_(wanted))
    if created_from is not None:
        query = query.filter(Invoice.created_at >= datetime.combine(created_from, datetime.min.time()))
    if created_to is not None:
        query = query.filter(Invoice.created_at <= datetime.combine(created_to, datetime.max.time()))
    query = query.order_by(Invoice.created_at.desc(), Invoice.id.desc())
    if limit is not None:
        query = query.offset(offset).limit(limit)
    elif offset:
        query = query.offset(offset)
    invoices = query.all()
    paid = paid_amounts(db, [invoice.id for invoice in invoices])
    return [
        {
            **serialize_invoice(invoice),
            "patientName": invoice.patient.short_name if invoice.patient else None,
            "paidAmount": paid.get(invoice.id, 0),
            "awaitingApproval": discount_awaits_approval(invoice),
        }
        for invoice in invoices
    ]


@router.get("/{invoice_id}", dependencies=[Depends(_MANAGE_INVOICE)])
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    return serialize_invoice(_get_invoice_or_404(db, invoice_id))


@router.post("", dependencies=[Depends(_MANAGE_INVOICE)])
def create_invoice(
    payload: InvoiceCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if patient is None:
        raise HTTPException(status_code=404, detail="Пациент не найден")

    if payload.appointment_id is not None:
        # Счёт «по приёму»: приём должен существовать и быть этого пациента —
        # раньше id принимался как есть (чужой приём или FK-ошибка 500).
        appointment = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
        if appointment is None:
            raise HTTPException(status_code=404, detail="Приём не найден")
        if appointment.patient_id != payload.patient_id:
            raise HTTPException(status_code=400, detail="Приём относится к другому пациенту")

    invoice = Invoice(
        invoice_number=_generate_invoice_number(db),
        patient_id=payload.patient_id,
        appointment_id=payload.appointment_id,
        status=InvoiceStatus.draft,
        created_by_id=current_employee.id,
    )
    db.add(invoice)
    db.flush()

    _apply_items(db, invoice, payload.items, payload.discount_total)

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="invoice",
        entity_id=invoice.id,
        action="create",
        changes={"patientId": payload.patient_id, "total": invoice.total},
        request=request,
    )
    db.commit()

    return serialize_invoice(_get_invoice_or_404(db, invoice.id))


@router.patch("/{invoice_id}/items", dependencies=[Depends(_MANAGE_INVOICE)])
def update_invoice_items(
    invoice_id: int,
    payload: InvoiceItemsUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    invoice = _get_invoice_or_404(db, invoice_id)
    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(status_code=409, detail="Позиции можно менять только в черновике")

    _apply_items(db, invoice, payload.items, payload.discount_total)

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="invoice",
        entity_id=invoice.id,
        action="update_items",
        changes={"total": invoice.total},
        request=request,
    )
    db.commit()

    return serialize_invoice(_get_invoice_or_404(db, invoice_id))


@router.post("/{invoice_id}/approve-discount", dependencies=[Depends(_APPROVE_DISCOUNT)])
def approve_discount(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    invoice = _get_invoice_or_404(db, invoice_id)
    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(
            status_code=409, detail="Подтверждать скидку можно только у черновика"
        )

    invoice.discount_approved_by_id = current_employee.id
    invoice.discount_approved_at = datetime.utcnow()

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="invoice",
        entity_id=invoice.id,
        action="approve_discount",
        changes=None,
        request=request,
    )
    db.commit()

    return serialize_invoice(_get_invoice_or_404(db, invoice_id))


@router.post("/{invoice_id}/issue", dependencies=[Depends(_MANAGE_INVOICE)])
def issue_invoice(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    invoice = _get_invoice_or_404(db, invoice_id)
    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(status_code=409, detail="Выставить можно только черновик")
    if not invoice.items:
        raise HTTPException(status_code=400, detail="В счёте нет ни одной позиции")

    if (
        _effective_discount_percent(invoice) > settings.default_discount_threshold_percent
        and invoice.discount_approved_by_id is None
    ):
        raise HTTPException(
            status_code=403,
            detail="Скидка выше порога — нужно подтверждение главврача",
        )

    invoice.status = InvoiceStatus.unpaid

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="invoice",
        entity_id=invoice.id,
        action="issue",
        changes={"total": invoice.total},
        request=request,
    )
    db.commit()

    return serialize_invoice(_get_invoice_or_404(db, invoice_id))


@router.post("/{invoice_id}/cancel", dependencies=[Depends(_MANAGE_INVOICE)])
def cancel_invoice(
    invoice_id: int,
    payload: InvoiceCancelIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    invoice = _get_invoice_or_404(db, invoice_id)
    if invoice.status not in (InvoiceStatus.draft, InvoiceStatus.unpaid):
        raise HTTPException(
            status_code=409,
            detail="Счёт с оплатой отменяется только через возврат, не напрямую",
        )

    invoice.status = InvoiceStatus.cancelled
    invoice.cancelled_at = datetime.utcnow()
    invoice.cancelled_by_id = current_employee.id
    invoice.cancellation_reason = payload.reason

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="invoice",
        entity_id=invoice.id,
        action="cancel",
        changes={"reason": payload.reason},
        request=request,
    )
    db.commit()

    return serialize_invoice(_get_invoice_or_404(db, invoice_id))


def serialize_payment(payment: Payment) -> dict:
    return {
        "id": payment.id,
        "invoiceId": payment.invoice_id,
        "amount": payment.amount,
        "method": payment.method.value,
        "cashShiftId": payment.cash_shift_id,
        "createdBy": payment.created_by.short_name if payment.created_by else None,
        "createdAt": payment.created_at.isoformat(),
        "reversalOfPaymentId": payment.reversal_of_payment_id,
        "refundReason": payment.refund_reason,
        "approvedBy": payment.approved_by.short_name if payment.approved_by else None,
    }


def _recompute_invoice_status_from_payments(db: Session, invoice: Invoice) -> None:
    """Решение E (§6 плана) — статус счёта не отдельная ветка на "возврат",
    а всегда пересчёт по факту net_paid. Один и тот же путь для обычной
    оплаты и для возврата (коммит 6), меньше шансов разойтись."""
    net_paid = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice.id)
        .with_entities(Payment.amount)
        .all()
    )
    total_paid = sum(row[0] for row in net_paid)
    if total_paid <= 0:
        invoice.status = InvoiceStatus.refunded
    elif total_paid < invoice.total:
        invoice.status = InvoiceStatus.partial
    else:
        invoice.status = InvoiceStatus.paid


@router.get("/{invoice_id}/payments", dependencies=[Depends(_MANAGE_INVOICE)])
def list_payments(invoice_id: int, db: Session = Depends(get_db)):
    _get_invoice_or_404(db, invoice_id)
    payments = (
        db.query(Payment)
        .options(joinedload(Payment.created_by), joinedload(Payment.approved_by))
        .filter(Payment.invoice_id == invoice_id)
        .order_by(Payment.created_at)
        .all()
    )
    return [serialize_payment(payment) for payment in payments]


@router.post("/{invoice_id}/payments", dependencies=[Depends(_MANAGE_INVOICE)])
def create_payment(
    invoice_id: int,
    payload: PaymentCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    invoice = _get_invoice_or_404(db, invoice_id)
    if invoice.status not in (InvoiceStatus.unpaid, InvoiceStatus.partial):
        raise HTTPException(
            status_code=409, detail="Оплата принимается только у выставленного счёта"
        )

    already_paid = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice_id)
        .with_entities(Payment.amount)
        .all()
    )
    total_paid = sum(row[0] for row in already_paid)
    # Решение G (§6 плана) — овердрафт запрещён: оплата сверх суммы счёта
    # отклоняется, а не тихо создаёт "переплату" без механизма её показать.
    if total_paid + payload.amount > invoice.total:
        raise HTTPException(
            status_code=409, detail="Сумма оплаты превышает остаток по счёту"
        )

    cash_shift_id = None
    if payload.method == PaymentMethod.cash:
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
                status_code=409, detail="Нет открытой кассовой смены — откройте смену"
            )
        cash_shift_id = open_shift.id

    payment = Payment(
        invoice_id=invoice_id,
        amount=payload.amount,
        method=payload.method,
        cash_shift_id=cash_shift_id,
        created_by_id=current_employee.id,
    )
    db.add(payment)
    db.flush()

    _recompute_invoice_status_from_payments(db, invoice)

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="payment",
        entity_id=payment.id,
        action="create",
        changes={"amount": payload.amount, "method": payload.method.value},
        request=request,
    )
    db.commit()

    payment = (
        db.query(Payment)
        .options(joinedload(Payment.created_by), joinedload(Payment.approved_by))
        .filter(Payment.id == payment.id)
        .first()
    )
    return serialize_payment(payment)
