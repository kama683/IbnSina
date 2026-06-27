from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import appointments, doctors, patients
app = FastAPI(title="IbnSina Api", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(doctors.router, prefix="/api/doctors", tags=["doctors"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["appointments"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])


@app.get("/health")
def health():
    return {"status": "ok"}
