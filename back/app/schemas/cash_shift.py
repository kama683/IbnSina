from pydantic import BaseModel, ConfigDict, Field


class CashShiftOpenIn(BaseModel):
    opening_balance: int = Field(ge=0, alias="openingBalance")

    model_config = ConfigDict(populate_by_name=True)


class CashShiftCloseIn(BaseModel):
    actual_cash: int = Field(ge=0, alias="actualCash")

    model_config = ConfigDict(populate_by_name=True)
