from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.employee import Employee, EmployeeRole, EmployeeStatus
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
    """Корень ролевой проверки. Уволенный сотрудник (status=fired) не проходит,
    даже если у него ещё валидный JWT — см. критерий готовности Этапа 0."""
    employee = current_user.employee
    if employee is None:
        raise HTTPException(status_code=401, detail="Сотрудник не найден")
    if employee.status == EmployeeStatus.fired:
        raise HTTPException(status_code=401, detail="Учётная запись деактивирована")
    return employee


def require_roles(*roles: EmployeeRole):
    """Фабрика зависимости: доступ только для сотрудников с одной из ролей.

    Используется как `Depends(require_roles(EmployeeRole.doctor, EmployeeRole.head_doctor))`.
    """

    def dependency(employee: Employee = Depends(get_current_employee)) -> Employee:
        if employee.role not in roles:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        return employee

    return dependency


def require_self_or_roles(id_param: str, *roles: EmployeeRole):
    """Пропускает, если employee.id совпадает с path-параметром id_param, либо
    роль сотрудника входит в roles.

    Ни один эндпоинт Этапа 0 пока это не использует (нет PATCH /employees/{id}
    и подобных) — задел под Этап 1/5, когда появится self-service редактирование.
    """

    def dependency(
        request: Request, employee: Employee = Depends(get_current_employee)
    ) -> Employee:
        target = request.path_params.get(id_param)
        if target is not None and str(employee.id) == str(target):
            return employee
        if employee.role in roles:
            return employee
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    return dependency
