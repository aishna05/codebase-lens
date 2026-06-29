# Codebase Lens — Backend API

FastAPI backend that fetches any public GitHub repository, indexes its source files, and runs AI analysis through Groq (Llama 3.3 70B).

---

## Quick Start

```bash
cd codebase-lens
cp backend/.env.example backend/.env   # add your GROQ_API_KEY
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8001
```

Interactive docs: `http://localhost:8001/docs`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for all AI analysis — free tier at console.groq.com |
| `GITHUB_TOKEN` | No | GitHub personal access token — raises rate limit from 60 to 5,000 req/hr |
| `DEBUG` | No | Enable verbose SQLAlchemy logging (default: `true`) |
| `CORS_ORIGINS` | No | JSON array of allowed frontend origins |

---

## API Reference

Base URL: `http://localhost:8001`

All endpoints accept and return `application/json`.

---

### `POST /api/analyze`

Full repository analysis. Fetches files from GitHub, runs summary + workflow analysis through Groq (Llama 3.3 70B), and returns a structured result. **Results are cached for 1 hour** — repeating the same URL returns instantly from cache.

**Request**
```json
{ "repo_url": "https://github.com/owner/repo" }
```

**Response**
```json
{
  "repo": "fastapi",
  "owner": "tiangolo",
  "stars": 79200,
  "forks": 6700,
  "language": "Python",
  "file_count": 412,
  "files_analyzed": 48,
  "summary": {
    "repo": "tiangolo/fastapi",
    "language": "Python",
    "description": "...",
    "purpose": "...",
    "tech_stack": [{ "name": "Starlette", "role": "Web layer" }],
    "key_features": ["Auto OpenAPI docs", "Async support", ...]
  },
  "workflow": {
    "repo": "tiangolo/fastapi",
    "architecture_pattern": "Library / Framework",
    "entry_points": ["fastapi/applications.py"],
    "data_flow": "1. Request hits Uvicorn...",
    "components": [{ "name": "Router", "description": "...", "key_files": ["fastapi/routing.py"] }],
    "notable_patterns": ["Dependency injection", "Type-hint driven validation"]
  }
}
```

---

### `GET /api/analyze/{owner}/{repo}`

Returns a **previously cached** analysis without re-fetching GitHub or calling Groq.

Returns `404` if the repo hasn't been analyzed yet in this session.

---

### `POST /api/summary`

Lightweight endpoint — returns only the summary portion. Uses cached data if the repo was already analyzed via `/api/analyze`. Otherwise fetches files and generates just the summary.

**Request**
```json
{ "repo_url": "https://github.com/owner/repo" }
```

**Response** — `SummaryResult` (same shape as `analysis.summary` above)

---

### `POST /api/workflow`

Returns only the workflow/architecture analysis. Uses cached data if available.

**Request**
```json
{ "repo_url": "https://github.com/owner/repo" }
```

**Response** — `WorkflowResult` (same shape as `analysis.workflow` above)

---

### `POST /api/chat`

Q&A against the repository. Sends the conversation history + repo source files to Groq (Llama 3.3 70B) and returns an answer with file citations.

The repo must have been analyzed first (files are cached from `/api/analyze`). If the file cache has expired, files are re-fetched automatically.

**Request**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "messages": [
    { "role": "user", "content": "How does authentication work?" }
  ]
}
```
Pass the full conversation history in `messages` — the model uses the last 10 messages as context.

**Response**
```json
{
  "answer": "Authentication is handled via the `OAuth2PasswordBearer` dependency in `fastapi/security/oauth2.py`...",
  "cited_files": ["fastapi/security/oauth2.py", "fastapi/dependencies/utils.py"]
}
```

---

### `POST /api/generate-doc`

Generates a full Markdown document about the repository. Uses cached repo files from `/api/analyze` if available.

**Request**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "doc_type": "onboarding",
  "custom_prompt": ""
}
```

`doc_type` options:

| Value | What it generates |
|---|---|
| `onboarding` | New engineer guide: setup, key concepts, where to start |
| `architecture` | System design doc: components, data models, design decisions |
| `api` | Full API reference auto-generated from source code |
| `security` | Security audit: auth flows, input validation, risks |
| `custom` | Anything — describe in `custom_prompt` |

**Response**
```json
{
  "doc_type": "onboarding",
  "content": "# FastAPI — Onboarding Guide\n\n## What is this?..."
}
```

---

### `GET /health`

```json
{ "status": "ok", "version": "0.1.0" }
```

---

## Architecture

```
backend/
├── main.py              # FastAPI app, CORS, router registration
├── config.py            # Pydantic settings (reads .env)
├── schemas.py           # All request/response Pydantic models + URL parser
├── requirements.txt
├── .env.example
├── routers/
│   ├── analyze.py       # POST /api/analyze, GET /api/analyze/{owner}/{repo}
│   ├── summary.py       # POST /api/summary
│   ├── workflow.py      # POST /api/workflow
│   ├── chat.py          # POST /api/chat
│   └── docs.py          # POST /api/generate-doc
└── services/
    ├── github.py        # GitHub API + file fetching logic
    ├── claude.py        # All Groq/Llama prompts + response parsing
    └── cache.py         # In-memory TTL cache (1 hr)
```

---

## Key Design Decisions

**File selection is priority-ranked, not random**
The GitHub service ranks files before fetching: README → package manifests → entry points → config files → model/router files. Binary files, lock files, `node_modules`, `__pycache__`, and `.git` are always skipped. Capped at 60 files / 500KB total — enough context for Claude without hitting token limits.

**Files are cached separately from analysis results**
`analysis_cache` stores the structured `AnalysisResult`. `files_cache` stores the raw file dict. This means `/api/chat` and `/api/generate-doc` can reuse fetched files without hitting GitHub again, even if you didn't call `/api/analyze` first.

**LLM responses are JSON-parsed into Pydantic models**
The summary and workflow prompts instruct the model to return strict JSON. The service strips any accidental markdown fences before parsing. If parsing fails on chat, the raw text is returned as-is so the user still gets an answer.

**Cache TTL is 1 hour (in-memory)**
Fast for development, stateless. In production this should be replaced with Redis or a database-backed cache to survive restarts and share state across workers.

**No database in v0.1**
Intentional — keeps the backend dependency-free for now. Adding persistence (PostgreSQL + SQLAlchemy) is a planned Phase 2 item.

---

## Error Codes

| Status | Meaning |
|---|---|
| `404` | Repo not found on GitHub, or no cached analysis exists |
| `422` | Invalid GitHub URL, empty repo, or missing required fields |
| `502` | GitHub API error or Groq API error (details in `detail` field) |
