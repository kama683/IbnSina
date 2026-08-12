from pydantic import BaseModel, ConfigDict, Field


class MedicationOut(BaseModel):
    id: int
    code: str | None
    name: str
    unit: str | None
    manufacturer: str | None
    min_stock_level: int | None
    is_controlled: bool

    model_config = ConfigDict(from_attributes=True)


class MedicationCreateIn(BaseModel):
    code: str | None = None
    name: str = Field(...)
    unit: str | None = None
    manufacturer: str | None = None
    min_stock_level: int | None = None
    is_controlled: bool = False

    model_config = ConfigDict(populate_by_name=True)
