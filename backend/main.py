from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from db import engine, Base
from routes import aqi, forecast
from services.scheduler import start_scheduler, scheduler
from routes.weather import router as weather_router
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up FastAPI app...")
    
    Base.metadata.create_all(bind=engine)
    
    start_scheduler()
    
    yield  
    
    logger.info("Shutting down... stopping scheduler.")
    scheduler.shutdown()

app = FastAPI(
    title="Hyper-Local Air Quality Forecaster",
    description="Real-time AQI data and forecasts for Hyderabad",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(aqi.router, prefix="/api/aqi", tags=["AQI"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecast"])
app.include_router(weather_router, prefix="/api/weather")


@app.get("/")
def root():
    return {"message": "Air Quality Forecaster API is running!"}

allow_origins=[
    "http://localhost:5173",
    "https://air-quality-forecaster-rjof.vercel.app",
],