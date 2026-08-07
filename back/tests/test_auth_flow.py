"""Этап 0, коммит 12: содержательные тесты auth-флоу, которых не хватало
по ходу — login/refresh/ротация/logout, блокировка уволенного сотрудника.
Матрица прав и default-deny уже покрыты в test_rbac_matrix.py/
test_default_deny.py (коммит 6).
"""
import uuid
from datetime import date

import pytest

from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.user import User
from app.security import hash_password

_PASSWORD = "test-pass-123"


@pytest.fixture()
def employee_user(db_session):
    """Один активный сотрудник+пользователь на вызов — email со случайным
    суффиксом, уникальным глобально (не только в рамках одного теста),
    иначе разные тесты сталкиваются по unique-констрейнту на users.email."""

    def _make(role: EmployeeRole = EmployeeRole.doctor, status: EmployeeStatus = EmployeeStatus.active):
        email = f"auth-flow-{role.value}-{uuid.uuid4().hex[:8]}@test.local"
        employee = Employee(
            full_name=f"Тест {role.value}",
            first_name_patronymic=f"Тест {role.value}",
            short_name=f"Т. {role.value}",
            initials="ТТ",
            role=role,
            hired_at=date.today(),
            status=status,
            salary_type=SalaryType.fixed,
        )
        db_session.add(employee)
        db_session.flush()

        user = User(
            email=email,
            full_name=f"Тест {role.value}",
            password_hash=hash_password(_PASSWORD),
            employee_id=employee.id,
        )
        db_session.add(user)
        db_session.commit()
        return email, user.id

    return _make


def test_login_success_sets_cookies_and_returns_user(client, employee_user):
    email, _ = employee_user()
    response = client.post("/api/auth/login", json={"email": email, "password": _PASSWORD})

    assert response.status_code == 200
    body = response.json()
    assert body["accessToken"]
    assert body["user"]["email"] == email
    assert "doctorId" not in body["user"]  # снято в коммите 11

    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


def test_login_wrong_password_401(client, employee_user):
    email, _ = employee_user()
    response = client.post("/api/auth/login", json={"email": email, "password": "wrong-password"})
    assert response.status_code == 401


def test_fired_employee_cannot_login(client, employee_user):
    email, _ = employee_user(status=EmployeeStatus.fired)
    response = client.post("/api/auth/login", json={"email": email, "password": _PASSWORD})
    assert response.status_code == 401


def test_refresh_rotates_token_and_rejects_reuse(client, employee_user):
    email, _ = employee_user()
    login_response = client.post("/api/auth/login", json={"email": email, "password": _PASSWORD})
    assert login_response.status_code == 200

    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 200
    assert refresh_response.json()["accessToken"]
    # Новый refresh-cookie должен отличаться от исходного (ротация).
    assert refresh_response.cookies.get("refresh_token") != login_response.cookies.get(
        "refresh_token"
    )

    # httpx.Client переиспользует cookie jar между запросами того же client,
    # поэтому чтобы предъявить именно СТАРЫЙ (уже отозванный) refresh, нужно
    # явно откатить cookie jar к состоянию сразу после login.
    client.cookies.set("refresh_token", login_response.cookies.get("refresh_token"))
    reuse_response = client.post("/api/auth/refresh")
    assert reuse_response.status_code == 401


def test_refresh_without_cookie_401(client):
    response = client.post("/api/auth/refresh")
    assert response.status_code == 401


def test_logout_revokes_refresh_and_clears_cookies(client, employee_user):
    email, _ = employee_user()
    client.post("/api/auth/login", json={"email": email, "password": _PASSWORD})

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json() == {"ok": True}

    # Повторный refresh уже отозванным токеном — 401.
    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 401


def test_logout_without_refresh_cookie_is_a_noop_200(client):
    response = client.post("/api/auth/logout")
    assert response.status_code == 200


def test_change_password_wrong_current_400(client, employee_user):
    email, _ = employee_user()
    login_response = client.post("/api/auth/login", json={"email": email, "password": _PASSWORD})
    token = login_response.json()["accessToken"]

    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "wrong", "new_password": "new-pass-456"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


def test_change_password_success_allows_relogin_with_new_password(client, employee_user):
    email, _ = employee_user()
    login_response = client.post("/api/auth/login", json={"email": email, "password": _PASSWORD})
    token = login_response.json()["accessToken"]

    response = client.post(
        "/api/auth/change-password",
        json={"current_password": _PASSWORD, "new_password": "new-pass-456"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    old_password_login = client.post(
        "/api/auth/login", json={"email": email, "password": _PASSWORD}
    )
    assert old_password_login.status_code == 401

    new_password_login = client.post(
        "/api/auth/login", json={"email": email, "password": "new-pass-456"}
    )
    assert new_password_login.status_code == 200
