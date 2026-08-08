"""Этап 0, коммит 6: параметризованный тест «роль × эндпоинт» из отчёта Фазы 1.

test_default_deny.py проверяет только «есть ли вообще auth-зависимость».
Этот файл проверяет, что она пускает/блокирует ИМЕННО те роли, что записаны
в матрице §2.2 плана (см. комментарии-обоснования рядом с require_roles(...)
в самих роутерах — appointments.py, patients.py, search.py, icd10.py).

Сигнал единственный и универсальный: 403 = роль отвергнута ролевой
зависимостью, всё остальное (200/404/409/422/...) = зависимость её пропустила
(само бизнес-действие могло не удаться по другой причине — это не предмет
этого теста). Тела POST/PATCH нарочно невалидны ({}) — эмпирически проверено,
что require_roles()/get_current_employee поднимает HTTPException до того, как
FastAPI дойдёт до валидации тела, так что 403 для отвергнутых ролей приходит
раньше 422.
"""
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.user import User
from app.security import hash_password

_PASSWORD = "test-pass-123"

_ALL_ROLES = set(EmployeeRole)


@pytest.fixture(scope="module")
def module_client():
    return TestClient(app)


@pytest.fixture(scope="module")
def role_tokens(module_client):
    """Заводит по одному Employee+User на каждую роль один раз на модуль и
    логинится за каждого — иначе повторный запуск фикстуры на каждый
    параметризованный кейс упёрся бы в UniqueViolation по email."""
    session = SessionLocal()
    tokens: dict[EmployeeRole, dict[str, str]] = {}
    try:
        for role in EmployeeRole:
            email = f"rbac-{role.value}@test.local"
            employee = Employee(
                full_name=f"Тест {role.value}",
                first_name_patronymic=f"Тест {role.value}",
                short_name=f"Т. {role.value}",
                initials="ТТ",
                role=role,
                hired_at=date.today(),
                status=EmployeeStatus.active,
                salary_type=SalaryType.fixed,
            )
            session.add(employee)
            session.flush()

            user = User(
                email=email,
                full_name=f"Тест {role.value}",
                password_hash=hash_password(_PASSWORD),
                employee_id=employee.id,
            )
            session.add(user)
            session.commit()

            response = module_client.post(
                "/api/auth/login", json={"email": email, "password": _PASSWORD}
            )
            assert response.status_code == 200, response.text
            token = response.json()["accessToken"]
            tokens[role] = {"Authorization": f"Bearer {token}"}
        yield tokens
    finally:
        session.rollback()
        session.close()


R = EmployeeRole

# (method, path, allowed_roles) — path использует "1" как заглушку id, т.к.
# сам ресурс в этом тесте не заводится: для допущенных ролей это доходит до
# 404 "не найден" (не 403), что и требуется для проверки границы RBAC.
_ENDPOINTS: list[tuple[str, str, frozenset[EmployeeRole]]] = [
    ("GET", "/api/appointments?from=2026-01-01&to=2026-01-07",
     frozenset({R.reception, R.doctor, R.nurse, R.head_doctor})),
    ("GET", "/api/appointments/week",
     frozenset({R.reception, R.doctor, R.nurse, R.head_doctor})),
    ("GET", "/api/appointments/stats/week",
     frozenset({R.doctor, R.head_doctor})),
    ("GET", "/api/appointments/queue",
     frozenset({R.reception, R.doctor, R.nurse, R.head_doctor})),
    ("GET", "/api/appointments/today",
     frozenset({R.reception, R.doctor, R.nurse, R.head_doctor})),
    ("GET", "/api/appointments/current",
     frozenset({R.reception, R.doctor, R.nurse, R.head_doctor})),
    ("GET", "/api/appointments/available-slots?employeeId=1&date=2026-08-10",
     frozenset({R.reception, R.doctor, R.head_doctor})),
    ("POST", "/api/appointments",
     frozenset({R.reception, R.doctor, R.head_doctor})),
    # Route-level guard теперь объединение прав трёх действий (осмотр/отмена/
    # перенос) — решение B, §6.1 плана Этапа 1. Тонкая матрица "какой роли
    # какое ИМЕННО действие разрешено" не проверяется пустым телом (оно не
    # задевает ни один из трёх наборов полей) — это отдельно в
    # test_appointment_cancellation.py.
    ("PATCH", "/api/appointments/1",
     frozenset({R.reception, R.doctor, R.head_doctor})),
    ("GET", "/api/patients",
     frozenset({R.reception, R.doctor, R.nurse, R.accountant, R.head_doctor})),
    ("POST", "/api/patients",
     frozenset({R.reception, R.doctor, R.nurse, R.accountant, R.head_doctor})),
    ("GET", "/api/patients/1",
     frozenset({R.reception, R.doctor, R.nurse, R.accountant, R.head_doctor})),
    ("PATCH", "/api/patients/1",
     frozenset({R.reception, R.head_doctor})),
    ("GET", "/api/patients/1/history",
     frozenset({R.reception, R.doctor, R.nurse, R.head_doctor})),
    ("GET", "/api/patients/1/health-metrics",
     frozenset({R.doctor, R.nurse, R.head_doctor})),
    ("GET", "/api/patients/1/vaccinations",
     frozenset({R.doctor, R.nurse, R.head_doctor})),
    ("GET", "/api/patients/1/examination",
     frozenset({R.doctor, R.head_doctor})),
    ("GET", "/api/patients/1/visit-history",
     frozenset({R.reception, R.doctor, R.nurse, R.head_doctor})),
    ("GET", "/api/search?q=test",
     frozenset({R.reception, R.doctor, R.nurse, R.accountant, R.head_doctor})),
    ("GET", "/api/icd10?q=test",
     frozenset({R.doctor, R.head_doctor})),
    ("GET", "/api/employees?role=doctor",
     frozenset({R.reception, R.doctor, R.head_doctor})),
    ("GET", "/api/employees/me", frozenset(_ALL_ROLES)),
    ("GET", "/api/employees/me/profile", frozenset(_ALL_ROLES)),
    ("PATCH", "/api/employees/me", frozenset(_ALL_ROLES)),
    # Этап 2, коммит 1 (docs/PHASE2_ANALYSIS.md §6, решение A) — accountant
    # вне доступа даже к прейскуранту, не только к счетам/платежам.
    ("GET", "/api/services",
     frozenset({R.reception, R.doctor, R.nurse, R.head_doctor})),
    ("POST", "/api/services",
     frozenset({R.head_doctor})),
    ("PATCH", "/api/services/1",
     frozenset({R.head_doctor})),
]


def _endpoint_ids():
    return [f"{method} {path}" for method, path, _ in _ENDPOINTS]


@pytest.mark.parametrize("method,path,allowed_roles", _ENDPOINTS, ids=_endpoint_ids())
def test_rbac_matrix(module_client, role_tokens, method, path, allowed_roles):
    denied_roles = _ALL_ROLES - allowed_roles
    body = {} if method in ("POST", "PATCH") else None

    for role in allowed_roles:
        response = module_client.request(method, path, headers=role_tokens[role], json=body)
        assert response.status_code != 403, (
            f"{method} {path}: роль {role.value} должна быть допущена, "
            f"а получила 403 ({response.text})"
        )

    for role in denied_roles:
        response = module_client.request(method, path, headers=role_tokens[role], json=body)
        assert response.status_code == 403, (
            f"{method} {path}: роль {role.value} должна получать 403, "
            f"а получила {response.status_code} ({response.text})"
        )
