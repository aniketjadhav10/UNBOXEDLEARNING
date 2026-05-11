"""
main.py
The entry point of the application. 
Can be run directly to execute the job once, or run in scheduled mode.
"""
import argparse
from generator import CurriculumGenerator
from scheduler import start_scheduler
from config import logger

def main():
    # Setup command line arguments
    parser = argparse.ArgumentParser(description="Gemini Curriculum Automation")
    parser.add_argument(
        '--run-now', 
        action='store_true', 
        help="Run the generation immediately without starting the continuous scheduler loop"
    )
    
    args = parser.parse_args()
    
    if args.run_now:
        logger.info("Running job immediately (--run-now flag provided).")
        generator = CurriculumGenerator()
        generator.generate_and_save()
        logger.info("Immediate execution completed.")
    else:
        # Start the continuous scheduler
        logger.info("Starting in scheduler mode. Use --run-now to run immediately.")
        start_scheduler()

if __name__ == "__main__":
    main()
