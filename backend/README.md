# Stark Paper Analyzer — Backend

Research paper summarization engine powered by FastAPI + OpenAI.

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

3. Create `.env` file (copy from `.env.example`):
   ```bash
   copy .env.example .env
   ```
   Then add your OpenAI API key to `.env`.

4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

5. Open API docs at: http://127.0.0.1:8000/docs

## Endpoints

- **GET /** — Health check
- **POST /upload** — Upload PDF, get extraction stats + detected sections (no GPT cost)
- **POST /analyze** — Upload PDF, get full structured summary (uses GPT)
