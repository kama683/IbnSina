from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User

router = APIRouter()


@router.get("/me")
def get_auth_user(db: Session = Depends(get_db)):
    """
    Текущий пользователь системы.
    Пока без JWT — возвращает первого пользователя из БД (режим разработки).
    """
    user = db.query(User).options(joinedload(User.doctor)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role.value,
        "doctorId": user.doctor_id,
    }
