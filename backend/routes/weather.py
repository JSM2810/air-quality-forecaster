import httpx
from fastapi import APIRouter

router = APIRouter()

@router.get("/current")
async def get_current_weather():
    url = (
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=17.385&longitude=78.4867"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
        "&timezone=Asia/Kolkata"
    )
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
        data = res.json()

    current = data["current"]
    return {
        "temperature": current["temperature_2m"],
        "humidity": current["relative_humidity_2m"],
        "wind_speed": current["wind_speed_10m"],
    }