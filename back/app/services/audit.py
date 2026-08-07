"""Этап 0, коммит 8: сервисный слой записи AuditLog.

Один тонкий helper вместо ORM-конструктора напрямую в роутерах — чтобы
формат записи (какие поля обязательны, откуда берётся IP) не расползался
по коду. Подключено к login/logout/change-password (auth.py) и к
self-service обновлению профиля сотрудника (employees.py/doctors.py) —
это единственные мутации, которые существуют в Этапе 0 (создания/увольнения
сотрудников через API пока нет).
"""
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record_audit(
    db: Session,
    *,
    actor_user_id: int | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    changes: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            changes=changes,
            ip=request.client.host if request is not None and request.client else None,
        )
    )
