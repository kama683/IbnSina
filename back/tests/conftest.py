import os

# Должно выполниться до первого импорта чего-либо из app.* — Settings() создаётся
# один раз при импорте app.config, и .env туда же подмешивается pydantic-settings.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://policlinica:policlinica_secret@localhost:5434/policlinica_test",
)
os.environ.setdefault("SECRET_KEY", "test-secret-key-do-not-use-in-production")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    return TestClient(app)
