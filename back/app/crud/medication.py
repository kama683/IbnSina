from sqlalchemy.orm import Session
from app.models.medication import Medication


def create_medication(db: Session, *, name: str, code: str | None = None, unit: str | None = None, manufacturer: str | None = None, min_stock_level: int | None = None, is_controlled: bool = False, is_active: bool = True) -> Medication:
    med = Medication(
        name=name,
        code=code,
        unit=unit,
        manufacturer=manufacturer,
        min_stock_level=min_stock_level,
        is_controlled=is_controlled,
        is_active=is_active,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


def get_medication(db: Session, med_id: int) -> Medication | None:
    return db.get(Medication, med_id)


def list_medications(db: Session, limit: int = 100) -> list[Medication]:
    return db.query(Medication).limit(limit).all()
