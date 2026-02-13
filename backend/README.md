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
