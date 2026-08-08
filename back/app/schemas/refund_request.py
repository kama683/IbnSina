from pydantic import BaseModel, ConfigDict, Field


class RefundRequestCreateIn(BaseModel):
    payment_id: int = Field(alias="paymentId")
    amount: int = Field(gt=0, description="Тиыны")
    reason: str

    model_config = ConfigDict(populate_by_name=True)
