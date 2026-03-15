from pydantic import BaseModel
from datetime import datetime

class AqiReadingOut(BaseModel):
    id: int
    city: str
    country: str
    location_name: str | None
    latitude: float | None
    longitude: float | None
    parameter: str
    value: float
    unit: str | None
    measured_at: datetime
    fetched_at: datetime | None

    class Config:
        from_attributes = True

class AqiForecastOut(BaseModel):
    id: int
    city: str
    latitude: float | None
    longitude: float | None
    parameter: str
    predicted_value: float
    forecast_at: datetime
    created_at: datetime | None

    class config:
        from_attributes= True