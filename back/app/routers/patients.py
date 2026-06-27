from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Patient
from app.schemas.patient import PatientListOut

router = APIRouter()


@router.get("", response_model=list[PatientListOut])
def list_patients(db: Session = Depends(get_db)):
    return (
        db.query(Patient)
        .options(joinedload(Patient.diseases))
        .order_by(Patient.full_name)
        .all()
    )


@router.get("/{patient_id}", response_model=PatientListOut)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = (
        db.query(Patient)
        .options(joinedload(Patient.diseases))
        .filter(Patient.id == patient_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Пациент не найден")
    return patient