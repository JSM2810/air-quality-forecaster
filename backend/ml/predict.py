import pickle
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
import psycopg2
import urllib.parse as urlparse
from psycopg2.extras import execute_values
from sqlalchemy import create_engine, text
import dotenv

dotenv.load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set!")

# SQLAlchemy URL
DB_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

# psycopg2 direct config
_url = urlparse.urlparse(DATABASE_URL)
DB_CONFIG = {
    "dbname":   _url.path[1:],
    "user":     _url.username,
    "password": _url.password,
    "host":     _url.hostname,
    "port":     _url.port,
}

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
FEATURES_PATH = os.path.join(os.path.dirname(__file__), "features.pkl")
FORECAST_HOURS = 24

def pm25_to_aqi(pm25):
    breakpoints = [
        (0.0,   12.0,   0,   50),
        (12.1,  35.4,   51,  100),
        (35.5,  55.4,   101, 150),
        (55.5,  150.4,  151, 200),
        (150.5, 250.4,  201, 300),
        (250.5, 350.4,  301, 400),
        (350.5, 500.4,  401, 500),
    ]
    for c_lo, c_hi, i_lo, i_hi in breakpoints:
        if c_lo <= pm25 <= c_hi:
            return round((i_hi - i_lo) / (c_hi - c_lo) * (pm25 - c_lo) + i_lo, 2)
    return 500.0

def load_model():
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    with open(FEATURES_PATH, "rb") as f:
        features = pickle.load(f)
    print(f" Model loaded | {len(features)} features")
    return model, features

def fetch_cities(engine) -> list:
    query = """
        SELECT city, AVG(latitude) as lat, AVG(longitude) as lon
        FROM aqi_readings
        GROUP BY city;
    """
    df = pd.read_sql(query, engine)
    cities = list(df.itertuples(index=False, name=None))
    print(f"Found cities: {[c[0] for c in cities]}")
    return cities

def fetch_wide_readings(engine, city: str) -> pd.DataFrame:
    query = text("""
        SELECT measured_at, parameter, value
        FROM aqi_readings
        WHERE city = :city
        ORDER BY measured_at ASC;
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"city": city})

    print(f" Raw rows fetched: {len(df)}")
    print(f" Parameters found: {df['parameter'].unique().tolist()}")

    if df.empty:
        return pd.DataFrame()

    wide = df.pivot_table(
        index="measured_at",
        columns="parameter",
        values="value",
        aggfunc="mean"
    ).reset_index()
    wide.columns.name = None
    wide = wide.sort_values("measured_at").reset_index(drop=True)

    print(f"  Wide shape: {wide.shape} — {len(wide)} timestamps × {len(wide.columns)} columns")

    if "pm25" not in wide.columns:
        print("  pm25 column missing after pivot! Cannot compute AQI.")
        return pd.DataFrame()

    wide["aqi_value"] = wide["pm25"].apply(pm25_to_aqi)
    print(f"  AQI range: {wide['aqi_value'].min():.1f} – {wide['aqi_value'].max():.1f}")

    return wide

def run_forecast(model, features: list, wide_df: pd.DataFrame) -> list:
    results = []
    last_time = pd.to_datetime(wide_df["measured_at"].iloc[-1])
    last_row  = wide_df.iloc[-1]
    recent_aqi = wide_df["aqi_value"].dropna().tolist()

    print(f"\n  Seeding with {len(recent_aqi)} AQI values")
    print(f"  Last timestamp : {last_time}")
    print(f"  Last known AQI : {recent_aqi[-1]:.2f}")

    for h in range(1, FORECAST_HOURS + 1):
        future_time = last_time + timedelta(hours=h)

        row = {
            "pm25":             last_row.get("pm25", 0),
            "pm10":             last_row.get("pm10", 0),
            "no2":              last_row.get("no2", 0),
            "no":               last_row.get("no", 0),
            "nox":              last_row.get("nox", 0),
            "so2":              last_row.get("so2", 0),
            "co":               last_row.get("co", 0),
            "o3":               last_row.get("o3", 0),
            "temperature":      last_row.get("temperature", 0),
            "relativehumidity": last_row.get("relativehumidity", 0),
            "wind_speed":       last_row.get("wind_speed", 0),
            "wind_direction":   last_row.get("wind_direction", 0),
            "hour":      future_time.hour,
            "day":       future_time.day,
            "month":     future_time.month,
            "weekday":   future_time.weekday(),
            "is_weekend": int(future_time.weekday() >= 5),
            "aqi_lag_1h":       recent_aqi[-1]  if len(recent_aqi) >= 1  else 0,
            "aqi_lag_3h":       recent_aqi[-3]  if len(recent_aqi) >= 3  else 0,
            "aqi_lag_24h":      recent_aqi[-24] if len(recent_aqi) >= 24 else recent_aqi[0],
            "aqi_rolling_3h":   np.mean(recent_aqi[-3:]),
            "aqi_rolling_24h":  np.mean(recent_aqi[-24:]) if len(recent_aqi) >= 24 else np.mean(recent_aqi),
        }

        X = np.array([[row.get(f, 0) for f in features]])
        predicted_aqi = max(0, round(float(model.predict(X)[0]), 2))

        results.append((future_time, predicted_aqi))
        recent_aqi.append(predicted_aqi)

        print(f"    +{h:02d}h | {future_time.strftime('%Y-%m-%d %H:%M')} → AQI: {predicted_aqi}")

    return results

def store_forecasts(city: str, lat: float, lon: float, forecasts: list):
    created_at = datetime.now(timezone.utc)
    rows = [
        (city, lat, lon, "pm25", predicted_aqi, forecast_time, created_at)
        for forecast_time, predicted_aqi in forecasts
    ]

    query = """
        INSERT INTO aqi_forecasts
            (city, latitude, longitude, parameter, predicted_value, forecast_at, created_at)
        VALUES %s
        ON CONFLICT (city, parameter, forecast_at) DO UPDATE
            SET predicted_value = EXCLUDED.predicted_value,
                created_at      = EXCLUDED.created_at;
    """
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            execute_values(cur, query, rows)
        conn.commit()
        print(f"\n  Saved {len(rows)} forecasts for {city}!")
    finally:
        conn.close()

def main():
    print("\n AQI Forecaster — Render Deploy")
    print("=" * 52)

    model, features = load_model()
    engine = create_engine(DB_URL)
    print(" Connected to Neon PostgreSQL\n")

    cities = fetch_cities(engine)
    if not cities:
        print("  No cities found. Run fetcher.py first!")
        return

    for city, lat, lon in cities:
        print(f"\n  City: {city}")
        print("-" * 40)

        wide_df = fetch_wide_readings(engine, city)

        if wide_df.empty or len(wide_df) < 3:
            print(f"   Not enough data for {city}, skipping.")
            continue

        forecasts = run_forecast(model, features, wide_df)

        if forecasts:
            store_forecasts(city, lat, lon, forecasts)

    print("\n All forecasts generated and stored!")
    engine.dispose()


if __name__ == "__main__":
    main()