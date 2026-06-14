# ResumeIQ

AI-powered resume analyzer with ATS scoring, skill gap analysis,
interview prep, gap projects, and cover letter generation.

**Stack:** React + Vite · FastAPI · Groq (llama-3.3-70b-versatile)

**Architecture:** `Browser → /api/* (FastAPI) → utils/ai_provider.py → Groq`

---

## Quick Start

### 1. Backend

```bash
cd resumeiq/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your GROQ_API_KEY
# Free key at: https://console.groq.com/keys
uvicorn app:app --reload --port 8000
```

### 2. Frontend (new terminal)

```bash
cd resumeiq/frontend
npm install
npm run dev
```

**App:** http://localhost:5173
**API docs:** http://localhost:8000/docs

---

## Switching AI Providers

Edit `backend/.env`:
```
AI_PROVIDER=openai   # or anthropic, gemini, openrouter
OPENAI_API_KEY=sk-...
```

No code changes needed. Only `backend/utils/ai_provider.py` knows about AI providers.

---

## Supported File Formats

| Format | Extension |
|--------|-----------|
| PDF    | .pdf (text-based only, not scanned) |
| Word   | .docx |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/health | Health check |
| POST | /api/analyze | Full resume analysis |
| POST | /api/rewrite | Rewrite a resume section |
| POST | /api/cover-letter | Generate cover letter |
| POST | /api/interview-questions | Standalone interview prep |
