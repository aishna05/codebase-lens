# Meeting Ghost 

> Your private AI coaching AI. Same meeting, five different truths.

After every meeting, each participant gets a private debrief: the moment you got talked over and didn't push back, the data you forgot to use, the credit you let someone else take for your idea.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async) |
| Realtime | WebSocket (FastAPI native) |
| Transcription | OpenAI Whisper API |
| AI Engine | Anthropic Claude (claude-sonnet-4-6) |
| Database | PostgreSQL + asyncpg |
| Frontend | React 18, Vite, Tailwind CSS |
| Auth | JWT (python-jose + passlib bcrypt) |

---

## Quick start (local dev)

### 1. Prerequisites

- Python 3.12+
- Node 22+
- PostgreSQL running locally (or use Docker)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in OPENAI_API_KEY, ANTHROPIC_API_KEY, and SECRET_KEY in .env

python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start from repo root (important for package imports)
cd ..
uvicorn backend.main:app --reload --port 8000
```

The API starts at http://localhost:8000. Swagger docs at http://localhost:8000/docs.
Tables are created automatically on first start.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App opens at http://localhost:5173. Vite proxies `/api` and `/ws` to the backend.

---

## Docker (full stack)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

docker compose up --build
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:8000

---

## How it works

```
1. Create a meeting
2. Each participant adds their PRIVATE BRIEF
   (role, goals, relationships, data they have available, ideas)
   Nobody else can read this — ever
3. Owner uploads the transcript (paste / audio file / live WebSocket)
4. Each participant requests their Ghost Report
5. Claude reads the full transcript + that person's private brief
6. Each person gets a different, private debrief
```

---

## Project structure

```
meeting-ghost/
├── backend/
│   ├── main.py              # FastAPI app + lifespan
│   ├── config.py            # Pydantic settings
│   ├── database.py          # Async SQLAlchemy engine
│   ├── dependencies.py      # JWT auth dependency
│   ├── models/              # ORM models (user, meeting, brief, transcript, report)
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routers/             # auth, meetings, briefs, transcripts, reports, websocket
│   └── services/
│       ├── auth_service.py     # JWT + bcrypt
│       ├── whisper_service.py  # Whisper API + transcript parser
│       ├── claude_service.py   # Ghost Report prompt + Claude call
│       └── report_service.py   # Report generation orchestrator
└── frontend/
    └── src/
        ├── App.jsx             # Routes
        ├── api/                # Axios clients per domain
        ├── context/            # AuthContext
        ├── hooks/              # useWebSocket
        ├── pages/              # Landing, Dashboard, Meeting, Brief, Transcript, Report
        └── components/Layout/  # Navbar + Layout
```

---

## Privacy model

- Private briefs: stored per-user per-meeting — no endpoint exposes another user's brief
- Ghost Reports: returned only to the owning user
- Meeting owners see aggregate status only (not other participants' brief/report content)
