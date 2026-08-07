from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.employee import Employee, EmployeeStatus
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.services.audit import record_audit
from app.security import (
    ACCESS_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_PATH,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)

router = APIRouter()


class LoginIn(BaseModel):
    email: str
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.employee.role.value,
        "employeeId": user.employee_id,
        # Deprecated-алиас employeeId, то же значение — снимается в коммите 11.
        "doctorId": user.employee_id,
        "mustChangePassword": user.must_change_password,
    }


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    # secure=False — локальный dev по http. За HTTPS в проде должно быть True
    # (вне рамок Этапа 0, здесь только сама httpOnly-механика).
    response.set_cookie(
        ACCESS_TOKEN_COOKIE_NAME,
        access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    response.set_cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
        secure=False,
        path=REFRESH_TOKEN_COOKIE_PATH,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_TOKEN_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE_NAME, path=REFRESH_TOKEN_COOKIE_PATH)


def _issue_refresh_token(db: Session, user_id: int, request: Request) -> str:
    raw_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_refresh_token(raw_token),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
            user_agent=request.headers.get("user-agent"),
            ip=request.client.host if request.client else None,
        )
    )
    db.flush()
    return raw_token


@router.post("/login")
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
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

    access_token = create_access_token(subject=user.email)
    refresh_token = _issue_refresh_token(db, user.id, request)
    record_audit(
        db,
        actor_user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        action="login",
        request=request,
    )
    db.commit()

    _set_auth_cookies(response, access_token, refresh_token)

    return {
        # Deprecated: пока фронт сам не переведён на credentials:"include"
        # (коммит 10), логин-форма по-прежнему кладёт токен в cookie вручную.
        # Бэкенд с этого коммита СВЕРХ ТОГО тем же ответом ставит httpOnly-
        # cookie — оба механизма временно работают параллельно.
        "accessToken": access_token,
        "tokenType": "bearer",
        "user": _serialize_user(user),
    }


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
    if raw_token is None:
        raise HTTPException(status_code=401, detail="Refresh-токен отсутствует")

    stored = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_refresh_token(raw_token))
        .first()
    )
    now = datetime.now(timezone.utc)
    if (
        stored is None
        or stored.revoked_at is not None
        or stored.expires_at.replace(tzinfo=timezone.utc) < now
    ):
        raise HTTPException(status_code=401, detail="Недействительный refresh-токен")

    user = (
        db.query(User)
        .options(joinedload(User.employee))
        .filter(User.id == stored.user_id)
        .first()
    )
    if user is None or user.employee is None or user.employee.status == EmployeeStatus.fired:
        raise HTTPException(status_code=401, detail="Учётная запись недоступна")

    # Ротация: предъявленный refresh сразу отзывается, выдаётся новая пара.
    # Если этот же (уже отозванный) токен предъявят повторно — сработает
    # проверка revoked_at выше и запрос получит 401.
    stored.revoked_at = now
    new_refresh_token = _issue_refresh_token(db, user.id, request)
    access_token = create_access_token(subject=user.email)
    db.commit()

    _set_auth_cookies(response, access_token, new_refresh_token)

    return {"accessToken": access_token, "tokenType": "bearer"}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    # Без Depends(get_current_user) намеренно: должно отрабатывать и когда
    # access-токен уже истёк, лишь бы был refresh — это единственная цель
    # вызова. См. PUBLIC_WHITELIST в test_default_deny.py.
    raw_token = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
    if raw_token is not None:
        stored = (
            db.query(RefreshToken)
            .filter(RefreshToken.token_hash == hash_refresh_token(raw_token))
            .first()
        )
        if stored is not None and stored.revoked_at is None:
            stored.revoked_at = datetime.now(timezone.utc)
            record_audit(
                db,
                actor_user_id=stored.user_id,
                entity_type="user",
                entity_id=stored.user_id,
                action="logout",
                request=request,
            )
            db.commit()

    _clear_auth_cookies(response)
    return {"ok": True}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Текущий пароль неверен")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="user",
        entity_id=current_user.id,
        action="change_password",
        request=request,
    )
    db.commit()
    return {"ok": True}


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
