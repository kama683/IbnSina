import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

ALGORITHM = "HS256"

# Имена cookie — общие для auth.py (Set-Cookie) и deps.py (чтение).
ACCESS_TOKEN_COOKIE_NAME = "access_token"
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"
REFRESH_TOKEN_COOKIE_PATH = "/api/auth"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    return payload.get("sub")


def generate_refresh_token() -> str:
    """Непрозрачный случайный токен — не JWT. Хранится в БД только его хеш
    (hash_refresh_token), сам токен живёт только в httpOnly-cookie клиента."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    # sha256, не bcrypt: refresh-токен и так высокоэнтропийный случайный
    # секрет (не пароль пользователя), а хеш нужно быстро найти точным
    # совпадением по индексу — bcrypt для этого не подходит (соль на запись).
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
