"""
routes/forecast.py — Phase 7
Forecast endpoints for the AQI Forecaster API.

Endpoints:
  GET  /api/forecast/                     → latest 24hr forecast for all cities
  GET  /api/forecast/city?name=Hyderabad  → forecast for a specific city
  POST /api/forecast/run                  → trigger a fresh prediction run
"""

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import sys, os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import get_db
from models import AqiForecast
from schemas import AqiForecastOut

router = APIRouter()

@router.get("/", response_model=List[AqiForecastOut])
def get_all_forecasts(db: Session = Depends(get_db)):
    """
    Returns the latest batch of forecasts across all cities.
    Ordered by city, then forecast time ascending.
    """
    latest = db.execute(text("""
        SELECT city, MAX(created_at) as max_created
        FROM aqi_forecasts
        GROUP BY city
    """)).fetchall()

    if not latest:
        raise HTTPException(status_code=404, detail="No forecasts found. Run /api/forecast/run first.")

    results = []
    for city, max_created in latest:
        rows = (
            db.query(AqiForecast)
            .filter(
                AqiForecast.city == city,
                AqiForecast.created_at == max_created
            )
            .order_by(AqiForecast.forecast_at.asc())
            .all()
        )
        results.extend(rows)

    return results

@router.get("/city", response_model=List[AqiForecastOut])
def get_forecast_by_city(
    name: str = Query(..., description="City name e.g. Hyderabad"),
    db: Session = Depends(get_db)
):
    """
    Returns the latest 24hr AQI forecast for a specific city.
    """
    latest = db.execute(text("""
        SELECT MAX(created_at)
        FROM aqi_forecasts
        WHERE city = :city
    """), {"city": name}).scalar()

    if not latest:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast found for city '{name}'. Check spelling or run /api/forecast/run."
        )

    rows = (
        db.query(AqiForecast)
        .filter(
            AqiForecast.city == name,
            AqiForecast.created_at == latest
        )
        .order_by(AqiForecast.forecast_at.asc())
        .all()
    )

    return rows

@router.get("/latest")
def get_next_hour_forecast(
    city: str = Query("Hyderabad", description="City name"),
    db: Session = Depends(get_db)
):
    """
    Returns just the very next hour's AQI prediction for a city.
    Great for a quick dashboard summary card.
    """

    latest_created = db.execute(text("""
        SELECT MAX(created_at) FROM aqi_forecasts WHERE city = :city
    """), {"city": city}).scalar()

    if not latest_created:
        raise HTTPException(status_code=404, detail=f"No forecast found for '{city}'.")

    row = (
        db.query(AqiForecast)
        .filter(
            AqiForecast.city == city,
            AqiForecast.created_at == latest_created,
        )
        .order_by(AqiForecast.forecast_at.asc())
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="No upcoming forecast found.")

    return {
        "city":            row.city,
        "forecast_at":     row.forecast_at,
        "predicted_aqi":   row.predicted_value,
        "aqi_category":    aqi_category(row.predicted_value),
        "latitude":        row.latitude,
        "longitude":       row.longitude,
    }

@router.post("/run")
async def trigger_forecast(background_tasks: BackgroundTasks):
    """
    Manually triggers a fresh 24hr forecast run.
    Runs predict.py in the background so the API doesn't hang.
    """
    background_tasks.add_task(run_predict_script)
    return {"message": "✅ Forecast run triggered! Results will be ready in a few seconds."}

def run_predict_script():
    """Runs predict.py as a subprocess."""
    import subprocess
    result = subprocess.run(
        ["python", "backend/ml/predict.py"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print("✅ predict.py completed successfully")
        print(result.stdout)
    else:
        print("❌ predict.py failed!")
        print(result.stderr)

def aqi_category(aqi: float) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for Sensitive Groups"
    if aqi <= 200:  return "Unhealthy"
    if aqi <= 300:  return "Very Unhealthy"
    return "Hazardous"