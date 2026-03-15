from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import get_db
from models import AqiReading
from schemas import AqiReadingOut
from services.fetcher import fetch_and_store_aqi

router = APIRouter()

@router.get("/latest", response_model=List[AqiReadingOut])
def get_latest_readings(db: Session = Depends(get_db)):
    readings = (
        db.query(AqiReading)
        .order_by(AqiReading.measured_at.desc())
        .limit(50)
        .all()
    )
    return readings

@router.get("/parameter", response_model=List[AqiReadingOut])
def get_by_parameter(
    name: str = Query(..., description="e.g. pm25, co, no2"),
    db: Session = Depends(get_db)
):
    readings = (
        db.query(AqiReading)
        .filter(AqiReading.parameter == name)
        .order_by(AqiReading.measured_at.desc())
        .limit(50)
        .all()
    )
    return readings

@router.get("/fetch-now")
async def trigger_fetch_now():
    """Manually triggers a fresh data fetch — for testing only"""
    await fetch_and_store_aqi()
    return {"message": "✅ Fetch triggered successfully!"}

@router.get("/location", response_model=List[AqiReadingOut])
def get_by_location(
    name: str = Query(..., description="e.g. Zoo Park"),
    db: Session = Depends(get_db)
):
    readings = (
        db.query(AqiReading)
        .filter(AqiReading.location_name.ilike(f"%{name}%"))
        .order_by(AqiReading.measured_at.desc())
        .limit(50)
        .all()
    )
    return readings
@router.get("/history/city")
def get_city_history(name: str, db: Session = Depends(get_db)):
    results = db.execute(text("""
        SELECT measured_at, AVG(value) as avg_value
        FROM aqi_readings
        WHERE city = :city
          AND parameter = 'pm25'
          AND measured_at >= (SELECT MAX(measured_at) FROM aqi_readings WHERE city = :city AND parameter = 'pm25') - INTERVAL '24 hours'
        GROUP BY measured_at
        ORDER BY measured_at ASC
    """), {"city": name}).fetchall()
    return [{"measured_at": str(r[0]), "value": round(r[1], 1)} for r in results]