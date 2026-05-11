# Gemini Curriculum Automation

A complete, production-ready Python automation project that uses the Google Gemini API to generate educational topics, tasks, and activities on a daily schedule, saving them as both JSON and Markdown files.

## Project Structure
- `config.py`: Centralized configuration, `.env` loading, and logging setup.
- `gemini_client.py`: Robust API connection with exponential backoff retry logic.
- `generator.py`: Prompt management, JSON formatting, and file saving logic.
- `scheduler.py`: Continuous schedule loop using the `schedule` library.
- `main.py`: Entry point for immediate or scheduled execution.

## Setup Instructions

1. **Install Python**: Ensure you have Python 3.9+ installed.
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Configure Environment Variables**:
   Copy the example environment file and add your Gemini API Key.
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `GEMINI_API_KEY=your_actual_api_key`.

## Running the Application

### 1. Run Immediately (Testing)
If you want to test the script without waiting for the scheduled time:
```bash
python main.py --run-now
```

### 2. Run Continuous Local Scheduler
Starts a continuous Python loop that runs the job every day at the time specified in your `.env` (`SCHEDULE_TIME`, default is 09:00).
```bash
python main.py
```

---

## Alternative Scheduling Methods (Production deployment)

If you are deploying this to a server, relying on system schedulers combined with the `--run-now` flag is usually safer than running a continuous `while True` Python loop.

### Option A: Linux Cron Job
1. Open your crontab editor:
   ```bash
   crontab -e
   ```
2. Add a rule to run every day at 9:00 AM. Ensure you point to your project directory and Python executable.
   ```cron
   # m h  dom mon dow   command
   0 9 * * * cd /path/to/automation && /usr/bin/python3 main.py --run-now >> cron.log 2>&1
   ```

### Option B: Windows Task Scheduler
1. Open **Task Scheduler** from the start menu and click **Create Basic Task**.
2. Name it "Gemini Automation" and set the trigger to "Daily" at your preferred time.
3. For "Action", choose **"Start a program"**.
4. **Program/script**: `python` (or the full path to `python.exe` if not in PATH).
5. **Add arguments**: `main.py --run-now`
6. **Start in**: `C:\path\to\your\automation\` folder.

### Option C: Docker Scheduled Container
If using Docker, you can run the container on a schedule (e.g., via GitLab CI, GitHub Actions, or Kubernetes CronJobs).

1. Create a `Dockerfile`:
   ```dockerfile
   FROM python:3.10-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   # Run immediately on container start
   CMD ["python", "main.py", "--run-now"]
   ```
2. Build the image:
   ```bash
   docker build -t gemini-automation .
   ```
3. Run the container explicitly with your `.env` file:
   ```bash
   docker run --rm --env-file .env gemini-automation
   ```
   (You can then trigger this `docker run` command via cron or a CI/CD pipeline).
