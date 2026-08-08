from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentMethod


class PaymentCreateIn(BaseModel):
    amount: int = Field(gt=0, description="Тиыны")
    method: PaymentMethod

    model_config = ConfigDict(populate_by_name=True)
