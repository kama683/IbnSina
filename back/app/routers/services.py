from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_employee, require_roles
from app.models.employee import Employee, EmployeeRole
from app.models.service import Service
from app.schemas.service import ServiceCreateIn, ServiceUpdateIn
from app.services.audit import record_audit
from app.models.invoice_item import InvoiceItem

router = APIRouter()

# Этап 2, коммит 1 (docs/PHASE2_ANALYSIS.md §6, решение A) — accountant вне
# доступа даже к прейскуранту: решение 5 плана трактуется как "ноль прав до
# Этапа 4" целиком, не только счета/платежи/отчёты.
#
# Врачи и медсёстры прейскурант не видят: управляют им head_doctor и admin,
# reception только читает — цены нужны ему для выставления счетов.
_VIEW_SERVICES = require_roles(
    EmployeeRole.reception, EmployeeRole.head_doctor, EmployeeRole.admin
)
_MANAGE_SERVICES = require_roles(EmployeeRole.head_doctor, EmployeeRole.admin)


def serialize_service(service: Service) -> dict:
    return {
        "id": service.id,
        "code": service.code,
        "name": service.name,
        "category": service.category.value,
        "price": service.price,
        "durationMinutes": service.duration_minutes,
        "isActive": service.is_active,
    }


def _get_service_or_404(db: Session, service_id: int) -> Service:
    service = db.query(Service).filter(Service.id == service_id).first()
    if service is None:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return service


@router.get("", dependencies=[Depends(_VIEW_SERVICES)])
def list_services(
    include_inactive: bool = Query(False, alias="includeInactive"),
    db: Session = Depends(get_db),
):
    query = db.query(Service)
    if not include_inactive:
        query = query.filter(Service.is_active.is_(True))
    services = query.order_by(Service.name).all()
    return [serialize_service(service) for service in services]


@router.post("", dependencies=[Depends(_MANAGE_SERVICES)])
def create_service(
    payload: ServiceCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    existing = db.query(Service).filter(Service.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Услуга с таким кодом уже существует")

    service = Service(
        code=payload.code,
        name=payload.name,
        category=payload.category,
        price=payload.price,
        duration_minutes=payload.duration_minutes,
    )
    db.add(service)
    db.flush()

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="service",
        entity_id=service.id,
        action="create",
        changes=payload.model_dump(exclude_none=True),
        request=request,
    )
    db.commit()

    return serialize_service(service)


@router.patch("/{service_id}", dependencies=[Depends(_MANAGE_SERVICES)])
def update_service(
    service_id: int,
    payload: ServiceUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    service = _get_service_or_404(db, service_id)

    if payload.code is not None and payload.code != service.code:
        conflict = (
            db.query(Service)
            .filter(Service.code == payload.code, Service.id != service_id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=409, detail="Услуга с таким кодом уже существует")
        service.code = payload.code

    if payload.name is not None:
        service.name = payload.name
    if payload.category is not None:
        service.category = payload.category
    if payload.price is not None:
        service.price = payload.price
    if payload.duration_minutes is not None:
        service.duration_minutes = payload.duration_minutes
    if payload.is_active is not None:
        service.is_active = payload.is_active

    changes = payload.model_dump(exclude_none=True)
    if changes:
        record_audit(
            db,
            actor_user_id=current_employee.user.id if current_employee.user else None,
            entity_type="service",
            entity_id=service.id,
            action="update",
            changes=changes,
            request=request,
        )

    db.commit()

    service = _get_service_or_404(db, service_id)
    return serialize_service(service)

@router.delete("/{service_id}", dependencies=[Depends(_MANAGE_SERVICES)])
def delete_service(
    service_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
):
    service = _get_service_or_404(db, service_id)

    used = db.query(InvoiceItem.id).filter(InvoiceItem.service_id == service_id).first()
    if used:
        raise HTTPException(
            status_code=409,
            detail="Услуга уже есть в счетах — удалить нельзя, отключите её",
        )

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="service",
        entity_id=service.id,
        action="delete",
        changes={"code": service.code, "name": service.name},
        request=request,
    )
    db.delete(service)
    db.commit()

    return {"id": service_id}

