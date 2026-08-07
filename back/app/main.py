from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import appointments, auth, employees, icd10, patients, search
app = FastAPI(title="IbnSina Api", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Правило A (default-deny, Этап 0): блокетной защиты на все роутеры разом больше нет.
# Каждый эндпоинт объявляет требуемую роль сам через Depends(get_current_employee)
# или Depends(require_roles(...)). Единственный публичный маршрут — /api/auth/login
# (плюс /health). Соответствие проверяется тестом test_default_deny.py — непокрытый
# маршрут там красный, а не тихо публичный в проде.
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(employees.router, prefix="/api/employees", tags=["employees"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["appointments"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(icd10.router, prefix="/api/icd10", tags=["icd10"])


@app.get("/health")
def health():
    return {"status": "ok"}
