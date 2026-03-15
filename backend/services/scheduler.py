from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from services.fetcher import fetch_and_store_aqi
import logging

logging.basicConfig(level=logging.INFO)
logger= logging.getLogger(__name__)

scheduler= AsyncIOScheduler()

def start_scheduler():
    """
    Call this once when fastAPI starts.
    It will schedule the fetch job to run every 6 hrs.
    """
    scheduler.add_job(
        fetch_and_store_aqi,
        trigger=IntervalTrigger(hours=6),
        id="aqi_fetch_job",
        replace_existing=True,
        max_instances=1
    )

    scheduler.start()
    logger.info("Scheduler started! AQI data will auto-fetch every 6 hrs.")
    