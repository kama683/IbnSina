from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.doctor import Doctor

router = APIRouter()


@router.get("/me")
def get_current_doctor(db: Session = Depends(get_db)):
    doctor = db.query(Doctor).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Врач не найден")

    return {
        "id": doctor.id,
        "fullName": doctor.full_name,
        "firstNamePatronymic": doctor.first_name_patronymic,
        "shortName": doctor.short_name,
        "initials": doctor.initials,
        "role": doctor.role,
        "area": doctor.area,
    }
