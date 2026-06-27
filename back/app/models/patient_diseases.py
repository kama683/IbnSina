import enum
from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class DiseaseTagVariant(str, enum.Enum):
    green = "green"
    purple = "purple"
    red = "red"
    blue = "blue"
    yellow = "yellow"
    orange = "orange"

class PatientDisease(Base):
    __tablename__ = "patient_diseases"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)

    variant: Mapped[DiseaseTagVariant] = mapped_column(
        Enum(DiseaseTagVariant, name="disease_tag_variant"),
        nullable=False,
    )

    patient = relationship("Patient", back_populates="diseases")