from urllib import response

import requests
import psycopg2
from datetime import datetime, timedelta
import time
import logging
import json
import os

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:moksha123@localhost/air_quality")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = "6db37e22c56857c25c6086627d71aacbdfee43fa1711480fd3fb1ce2ed06cf28"

headers = {
    "Accept": "application/json",
    "X-API-Key": API_KEY
}

CITIES = [
    {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
]


def get_city_sensors(city_name, lat, lon):
    url = "https://api.openaq.org/v3/locations"
    params = {
        "coordinates": f"{lat},{lon}",
        "radius": 25000,
        "limit": 10
    }
    response = requests.get(url, params=params, headers=headers)
    print(f"  API status: {response.status_code}")
    if response.status_code != 200:
        print(f"  API error: {response.text[:300]}")
        return []
    data = response.json()
    results = data.get("results", [])

    sensors = []
    for location in results:
        loc_name = location.get("name", "")
        coords = location.get("coordinates", {})

        country_raw = location.get("country", "IN")
        if isinstance(country_raw, str):
            country = country_raw
        elif isinstance(country_raw, dict):
            country = country_raw.get("code", "IN")
        else:
            country = "IN"

        for sensor in location.get("sensors", []):
            sensor_id = sensor.get("id")
            param = sensor.get("parameter", {})

            if isinstance(param, str):
                param_name = param
                param_unit = ""
            elif isinstance(param, dict):
                param_name = param.get("name", "")
                param_unit = param.get("units", "")
            else:
                param_name = ""
                param_unit = ""

            if not sensor_id or not param_name:
                continue

            sensors.append({
                "sensor_id": sensor_id,
                "loc_name":  loc_name,
                "lat":       coords.get("latitude"),
                "lon":       coords.get("longitude"),
                "country":   country,
                "parameter": param_name,
                "unit":      param_unit,
            })

    print(f"  Found {len(sensors)} sensors for {city_name}")
    return sensors


def fetch_historical_measurements(sensor_id, date_from, date_to, limit=1000):
    url = f"https://api.openaq.org/v3/sensors/{sensor_id}/measurements"
    params = {
        "date_from": date_from,
        "date_to":   date_to,
        "limit":     limit
    }
    try:
        response = requests.get(url, params=params, headers=headers, timeout=15)
        if response.status_code == 429:
            print("    Rate limited! Waiting 10 seconds...")
            time.sleep(10)
            response = requests.get(url, params=params, headers=headers, timeout=15)
        if response.status_code != 200:
            return []
        data = response.json()
        return data.get("results", [])
    except Exception as e:
        print(f"    Error fetching sensor {sensor_id}: {e}")
        return []


def fetch_and_store_historical():
    print("=" * 55)
    print("Starting HISTORICAL data fetch for ALL cities!")
    print("=" * 55)

    date_to   = datetime.utcnow()
    date_from = date_to - timedelta(days=180)
    date_from_str = date_from.strftime("%Y-%m-%dT%H:%M:%SZ")
    date_to_str   = date_to.strftime("%Y-%m-%dT%H:%M:%SZ")

    print(f"Fetching from: {date_from_str}")
    print(f"Fetching to:   {date_to_str}\n")

    conn = psycopg2.connect(dsn=DB_URL)
    cursor = conn.cursor()

    try:
        total_saved = 0
        total_skipped = 0

        for city in CITIES:
            print(f"\n>>> City: {city['name']}")
            sensors = get_city_sensors(city["name"], city["lat"], city["lon"])

            for i, s in enumerate(sensors):
                print(f"  [{i+1}/{len(sensors)}] {s['loc_name']} | {s['parameter']}")
                measurements = fetch_historical_measurements(
                    s["sensor_id"], date_from_str, date_to_str, limit=1000
                )
                print(f"    Got {len(measurements)} measurements")

                for m in measurements:
                    value = m.get("value")
                    period = m.get("period", {})
                    measured_at_str = period.get("datetimeTo", {}).get("utc")
                    if value is None or measured_at_str is None:
                        total_skipped += 1
                        continue
                    measured_at = datetime.fromisoformat(
                        measured_at_str.replace("Z", "+00:00")
                    )
                    try:
                        cursor.execute("""
                            INSERT INTO aqi_readings
                            (city, country, location_name, latitude, longitude,
                             parameter, value, unit, measured_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT DO NOTHING
                        """, (
                            city["name"], s["country"], s["loc_name"],
                            s["lat"], s["lon"], s["parameter"],
                            value, s["unit"], measured_at
                        ))
                        total_saved += 1
                    except Exception:
                        total_skipped += 1
                        continue

                conn.commit()
                time.sleep(0.3)

        print(f"\nDONE! Saved: {total_saved} | Skipped: {total_skipped}")
        print("Now re-run predict.py to get fresh forecasts!")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()  # add this line
        logger.error(f"Historical fetch failed: {e}")

    finally:
        cursor.close()
        conn.close()


async def fetch_and_store_aqi():
    """Scheduler function — fetches latest data for all cities every 6 hours"""
    print("Scheduler triggered! Fetching latest AQI data...\n")

    conn = psycopg2.connect(dsn=DB_URL)
    cursor = conn.cursor()

    try:
        saved_count = 0

        for city in CITIES:
            sensors = get_city_sensors(city["name"], city["lat"], city["lon"])

            for s in sensors:
                url = f"https://api.openaq.org/v3/sensors/{s['sensor_id']}/measurements"
                params = {"limit": 1}
                response = requests.get(url, params=params, headers=headers, timeout=10)
                if response.status_code != 200:
                    continue
                data = response.json()
                results = data.get("results", [])
                if not results:
                    continue

                measurement = results[0]
                value = measurement.get("value")
                period = measurement.get("period", {})
                measured_at_str = period.get("datetimeTo", {}).get("utc")

                if value is None or measured_at_str is None:
                    continue

                measured_at = datetime.fromisoformat(
                    measured_at_str.replace("Z", "+00:00")
                )

                cursor.execute("""
                    INSERT INTO aqi_readings
                    (city, country, location_name, latitude, longitude,
                     parameter, value, unit, measured_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (
                    city["name"], s["country"], s["loc_name"],
                    s["lat"], s["lon"], s["parameter"],
                    value, s["unit"], measured_at
                ))
                saved_count += 1

        conn.commit()
        print(f"Done! {saved_count} latest readings saved!")

    except Exception as e:
        conn.rollback()
        print(f"Scheduler fetch error: {e}")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    fetch_and_store_historical()