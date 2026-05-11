"""
config.py
Handles environment variables and configuration for the automation project.
"""
import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SCHEDULE_TIME = os.getenv("SCHEDULE_TIME", "09:00")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "output")

# Supabase settings
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") # Service role key recommended for automation
CHILD_ID = os.getenv("CHILD_ID") # Optional: If provided, tasks will automatically be assigned to this child

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("automation.log")
    ]
)

logger = logging.getLogger("automation")

if not GEMINI_API_KEY or GEMINI_API_KEY == "your_api_key_here":
    logger.warning("GEMINI_API_KEY environment variable is not set correctly. Please check your .env file.")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("SUPABASE_URL or SUPABASE_KEY is missing. Supabase integration will not work.")
