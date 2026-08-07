from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.deps import get_current_user
from app.routers import appointments, auth, doctors, employees, icd10, patients, search
app = FastAPI(title="IbnSina Api", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_auth_required = [Depends(get_current_user)]

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(
    employees.router, prefix="/api/employees", tags=["employees"], dependencies=_auth_required
)
app.include_router(
    doctors.router,
    prefix="/api/doctors",
    tags=["doctors (deprecated alias)"],
    dependencies=_auth_required,
)
app.include_router(
    appointments.router,
    prefix="/api/appointments",
    tags=["appointments"],
    dependencies=_auth_required,
)
app.include_router(
    patients.router, prefix="/api/patients", tags=["patients"], dependencies=_auth_required
)
app.include_router(
    search.router, prefix="/api/search", tags=["search"], dependencies=_auth_required
)
app.include_router(
    icd10.router, prefix="/api/icd10", tags=["icd10"], dependencies=_auth_required
)


@app.get("/health")
def health():
    return {"status": "ok"}
