"""
scheduler.py
Handles the scheduling logic to run the generator at specified times.
"""
import time
import schedule
from generator import CurriculumGenerator
from config import SCHEDULE_TIME, logger

def job():
    """
    The job to run when the schedule is triggered.
    """
    logger.info("Scheduled job triggered. Preparing to generate curriculum.")
    generator = CurriculumGenerator()
    generator.generate_and_save()

def start_scheduler():
    """
    Sets up and starts the scheduling loop.
    """
    logger.info(f"Starting scheduler. Job scheduled to run daily at {SCHEDULE_TIME}")
    
    # Schedule the job to run every day at the given time
    schedule.every().day.at(SCHEDULE_TIME).do(job)
    
    try:
        # Keep the script running to listen for the schedule
        while True:
            schedule.run_pending()
            time.sleep(1) # wait one second between checks
    except KeyboardInterrupt:
        logger.info("Scheduler stopped manually by user.")
