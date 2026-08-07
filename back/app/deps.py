from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.employee import Employee, EmployeeStatus
from app.models.user import User
from app.security import decode_access_token

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Не авторизован")

    email = decode_access_token(credentials.credentials)
    if email is None:
        raise HTTPException(status_code=401, detail="Недействительный или просроченный токен")

    user = (
        db.query(User).options(joinedload(User.employee)).filter(User.email == email).first()
    )
    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    return user


def get_current_employee(current_user: User = Depends(get_current_user)) -> Employee:
    """Пока без ролевой проверки — просто резолвит текущего сотрудника и
    блокирует уволенных. require_roles/require_self_or_roles появятся в
    коммите 6 вместе со снятием блокетной auth-зависимости из main.py."""
    employee = current_user.employee
    if employee is None:
        raise HTTPException(status_code=401, detail="Сотрудник не найден")
    if employee.status == EmployeeStatus.fired:
        raise HTTPException(status_code=401, detail="Учётная запись деактивирована")
    return employee
