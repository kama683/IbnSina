"""Аватарка сотрудника: PUT/DELETE /api/employees/me/avatar и GET /{id}/avatar."""
import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.employee import Employee, EmployeeRole, EmployeeStatus, SalaryType
from app.models.user import User
from app.security import hash_password
from app.services import avatars

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


@pytest.fixture()
def auth(client, db_session, tmp_path, monkeypatch):
    monkeypatch.setattr(avatars, "AVATAR_DIR", tmp_path)
    email = f"avatar-{uuid.uuid4().hex[:8]}@test.local"
    employee = Employee(
        full_name="Аватаров Тест",
        first_name_patronymic="Тест",
        short_name="Аватаров Т.",
        initials="АТ",
        role=EmployeeRole.reception,
        hired_at=date.today(),
        status=EmployeeStatus.active,
        salary_type=SalaryType.fixed,
    )
    db_session.add(employee)
    db_session.flush()
    db_session.add(
        User(
            email=email,
            full_name=employee.full_name,
            password_hash=hash_password("test-pass-123"),
            employee_id=employee.id,
        )
    )
    db_session.commit()
    response = client.post(
        "/api/auth/login", json={"email": email, "password": "test-pass-123"}
    )
    token = response.json()["accessToken"]
    return employee.id, {"Authorization": f"Bearer {token}"}


def test_upload_serve_replace_and_delete(client, auth, tmp_path):
    employee_id, headers = auth

    assert client.get("/api/employees/me", headers=headers).json()["avatarUrl"] is None

    response = client.put("/api/employees/me/avatar", content=PNG, headers=headers)
    assert response.status_code == 200, response.text
    url = response.json()["avatarUrl"]
    assert url.startswith(f"/api/employees/{employee_id}/avatar?v=")
    assert client.get("/api/employees/me", headers=headers).json()["avatarUrl"] == url

    served = client.get(url, headers=headers)
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/png"
    assert served.content == PNG

    # повторная загрузка заменяет файл, старый удаляется с диска
    client.put("/api/employees/me/avatar", content=PNG + b"1", headers=headers)
    assert len(list(tmp_path.iterdir())) == 1

    response = client.delete("/api/employees/me/avatar", headers=headers)
    assert response.json() == {"avatarUrl": None}
    assert list(tmp_path.iterdir()) == []
    assert client.get(url, headers=headers).status_code == 404


def test_rejects_non_image_and_oversized(client, auth, monkeypatch):
    _, headers = auth

    bad = client.put("/api/employees/me/avatar", content=b"<svg onload=alert(1)>", headers=headers)
    assert bad.status_code == 400

    monkeypatch.setattr(avatars, "MAX_AVATAR_BYTES", 16)
    big = client.put("/api/employees/me/avatar", content=PNG, headers=headers)
    assert big.status_code == 413


def test_avatar_requires_auth(auth):
    employee_id, _ = auth
    client = TestClient(app)  # без cookie сессии, которую оставил логин
    assert client.get(f"/api/employees/{employee_id}/avatar").status_code == 401
    assert client.put("/api/employees/me/avatar", content=PNG).status_code == 401
