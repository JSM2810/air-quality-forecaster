from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from db import Base

class AqiReading(Base):
    __tablename__="aqi_readings"

    id= Column(Integer,primary_key=True, index=True)
    city=Column(String(100),nullable=False)
    country=Column(String(10),nullable=False)
    location_name=Column(String(200))
    latitude=Column(Float)
    parameter = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(20))
    measured_at = Column(DateTime, nullable=False)
    fetched_at = Column(DateTime, server_default=func.now())

class AqiForecast(Base):
    __tablename__ = "aqi_forecasts"

    id              = Column(Integer, primary_key=True, index=True)
    city            = Column(String(100), nullable=False)
    latitude        = Column(Float)
    longitude       = Column(Float)
    parameter       = Column(String(50), nullable=False)
    predicted_value = Column(Float, nullable=False)
    forecast_at     = Column(DateTime, nullable=False)
    created_at      = Column(DateTime, server_default=func.now())