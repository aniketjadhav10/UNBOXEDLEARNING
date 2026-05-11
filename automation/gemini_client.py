"""
gemini_client.py
Handles the connection and requests to the Google Gemini API using the latest SDK.
Includes retry logic using the tenacity library.
"""
import json
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
from config import GEMINI_API_KEY, logger

# Configure the Gemini API client
if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
    genai.configure(api_key=GEMINI_API_KEY)

# Use the recommended model for general text/JSON generation
MODEL_NAME = "gemini-1.5-flash"

class GeminiClient:
    def __init__(self):
        self.model = genai.GenerativeModel(MODEL_NAME)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def generate_json_response(self, prompt: str) -> dict:
        """
        Generates content from Gemini and expects a JSON response.
        Automatically retries up to 3 times on failure with exponential backoff.
        """
        logger.info(f"Sending request to Gemini API using model: {MODEL_NAME}")
        try:
            # We explicitly ask the model to return JSON structure
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            # Parse the response text as JSON
            result = json.loads(response.text)
            logger.info("Successfully received and parsed JSON response from Gemini.")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Gemini response: {e}")
            logger.error(f"Raw response: {response.text}")
            raise
        except Exception as e:
            logger.error(f"Error during Gemini API call: {e}")
            raise
