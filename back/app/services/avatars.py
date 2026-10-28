"""Хранение аватарок сотрудников на диске.

Формат определяем по «магическим» байтам, а не по Content-Type от клиента:
так в uploads не попадёт ничего, кроме растровой картинки (SVG и HTML — это
XSS при отдаче с нашего origin, поэтому не допускаются).
"""
import secrets
from pathlib import Path

AVATAR_DIR = Path(__file__).resolve().parents[2] / "uploads" / "avatars"
MAX_AVATAR_BYTES = 5 * 1024 * 1024

_MEDIA_TYPES = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def detect_extension(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def media_type(filename: str) -> str:
    return _MEDIA_TYPES.get(filename.rsplit(".", 1)[-1], "application/octet-stream")


def save_avatar(employee_id: int, data: bytes, extension: str) -> str:
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{employee_id}-{secrets.token_hex(6)}.{extension}"
    (AVATAR_DIR / filename).write_bytes(data)
    return filename


def avatar_path(filename: str) -> Path:
    return AVATAR_DIR / filename


def delete_avatar(filename: str | None) -> None:
    if filename:
        avatar_path(filename).unlink(missing_ok=True)
