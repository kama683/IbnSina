from pydantic import BaseModel, ConfigDict, Field


class InvoiceItemIn(BaseModel):
    service_id: int = Field(alias="serviceId")
    quantity: int = Field(1, ge=1)
    discount_amount: int = Field(0, ge=0, alias="discountAmount")

    model_config = ConfigDict(populate_by_name=True)


class InvoiceCreateIn(BaseModel):
    patient_id: int = Field(alias="patientId")
    appointment_id: int | None = Field(None, alias="appointmentId")
    items: list[InvoiceItemIn] = Field(default_factory=list)
    discount_total: int = Field(0, ge=0, alias="discountTotal")

    model_config = ConfigDict(populate_by_name=True)


class InvoiceItemsUpdateIn(BaseModel):
    items: list[InvoiceItemIn]
    discount_total: int = Field(0, ge=0, alias="discountTotal")

    model_config = ConfigDict(populate_by_name=True)


class InvoiceCancelIn(BaseModel):
    reason: str | None = None

    model_config = ConfigDict(populate_by_name=True)
