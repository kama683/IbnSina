from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models.employee import Employee, EmployeeStatus
from app.models.user import User
from app.security import create_access_token, verify_password

router = APIRouter()


class LoginIn(BaseModel):
    email: str
    password: str


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.employee.role.value,
        "employeeId": user.employee_id,
        # Deprecated-алиас employeeId, то же значение — снимается в коммите 11.
        "doctorId": user.employee_id,
    }


@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .options(joinedload(User.employee).joinedload(Employee.doctor_profile))
        .filter(User.email == payload.email)
        .first()
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    if user.employee.status == EmployeeStatus.fired:
        raise HTTPException(status_code=401, detail="Учётная запись деактивирована")

    token = create_access_token(subject=user.email)
    return {
        "accessToken": token,
        "tokenType": "bearer",
        "user": _serialize_user(user),
    }


@router.get("/me")
def get_auth_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = (
        db.query(User)
        .options(joinedload(User.employee).joinedload(Employee.doctor_profile))
        .filter(User.id == current_user.id)
        .first()
    )
    return _serialize_user(user)
