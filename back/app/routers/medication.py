from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_employee, require_roles
from app.models.employee import EmployeeRole
from app.models.medication import Medication
from app.schemas.medication import MedicationCreateIn
from app.services.audit import record_audit

router = APIRouter()

_VIEW_MEDICATIONS = require_roles(
    EmployeeRole.reception, EmployeeRole.doctor, EmployeeRole.nurse, EmployeeRole.head_doctor
)
_MANAGE_MEDICATIONS = require_roles(EmployeeRole.head_doctor)


def serialize_medication(med: Medication) -> dict:
    return {
        "id": med.id,
        "code": med.code,
        "name": med.name,
        "unit": med.unit,
        "manufacturer": med.manufacturer,
        "minStockLevel": med.min_stock_level,
        "isControlled": med.is_controlled,
        "isActive": med.is_active,
    }


@router.get("", dependencies=[Depends(_VIEW_MEDICATIONS)])
def list_medications(include_inactive: bool = Query(False, alias="includeInactive"), db: Session = Depends(get_db)):
    query = db.query(Medication)
    if not include_inactive:
        query = query.filter(Medication.is_active.is_(True))
    meds = query.order_by(Medication.name).all()
    return [serialize_medication(m) for m in meds]


@router.post("", dependencies=[Depends(_MANAGE_MEDICATIONS)])
def create_medication_endpoint(payload: MedicationCreateIn, request: Request, db: Session = Depends(get_db), current_employee = Depends(get_current_employee)):
    existing = db.query(Medication).filter(Medication.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Medication with this code already exists")
    med = Medication(
        code=payload.code,
        name=payload.name,
        unit=payload.unit,
        manufacturer=payload.manufacturer,
        min_stock_level=payload.min_stock_level,
        is_controlled=payload.is_controlled,
        is_active=payload.is_active,
    )
    db.add(med)
    db.flush()

    record_audit(
        db,
        actor_user_id=current_employee.user.id if current_employee.user else None,
        entity_type="medication",
        entity_id=med.id,
        action="create",
        changes=payload.model_dump(exclude_none=True),
        request=request,
    )
    db.commit()
    return serialize_medication(med)


@router.patch("/{med_id}", dependencies=[Depends(_MANAGE_MEDICATIONS)])
def update_medication(med_id: int, payload: MedicationCreateIn, request: Request, db: Session = Depends(get_db), current_employee = Depends(get_current_employee)):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if med is None:
        raise HTTPException(status_code=404, detail="Medication not found")
    if payload.code is not None and payload.code != med.code:
        conflict = db.query(Medication).filter(Medication.code == payload.code, Medication.id != med_id).first()
        if conflict:
            raise HTTPException(status_code=409, detail="Medication with this code already exists")
        med.code = payload.code
    if payload.name is not None:
        med.name = payload.name
    if payload.unit is not None:
        med.unit = payload.unit
    if payload.manufacturer is not None:
        med.manufacturer = payload.manufacturer
    if payload.min_stock_level is not None:
        med.min_stock_level = payload.min_stock_level
    if payload.is_controlled is not None:
        med.is_controlled = payload.is_controlled
    if payload.is_active is not None:
        med.is_active = payload.is_active

    changes = payload.model_dump(exclude_none=True)
    if changes:
        record_audit(
            db,
            actor_user_id=current_employee.user.id if current_employee.user else None,
            entity_type="medication",
            entity_id=med.id,
            action="update",
            changes=changes,
            request=request,
        )
    db.commit()
    return serialize_medication(med)
