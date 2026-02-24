# Stark Paper Analyzer — Backend

Research paper summarization engine powered by FastAPI + Google Gemini (free).

## Setup

1. Create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate   # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Get a free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

4. Create `.env` file:
   ```bash
   copy .env.example .env
   ```
   Then add your Gemini API key to `.env`.

5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

6. Open API docs at: http://127.0.0.1:8000/docs

## Endpoints

- **GET /** — Health check
- **POST /upload** — Upload PDF, get extraction stats + detected sections (no API cost)
- **POST /analyze** — Upload PDF, get full structured summary (uses Gemini)
   - Returns cached result automatically if the same PDF was analyzed before
   - Returns **429** if Gemini quota is exhausted
- **POST /jobs/analyze** — Upload PDF for async/background analysis
   - Returns `job_id`, `status_url`, and `result_url` immediately
- **GET /jobs/{job_id}** — Check async job status (`queued`, `running`, `completed`, `partial`, `failed`)
- **GET /jobs/{job_id}/result** — Fetch async job result when ready

## Quota Handling

- The backend retries Gemini requests with exponential backoff.
- If quota is still exhausted:
   - Sync endpoint (`/analyze`) returns **429** with guidance.
   - Async endpoint (`/jobs/analyze`) completes as `partial` and returns a fallback structure
      containing detected sections, while full semantic summaries can be retried later.
