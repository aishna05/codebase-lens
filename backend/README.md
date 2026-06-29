# Codebase Lens — Backend API

FastAPI backend with two distinct capabilities:

1. **GitHub repo analysis** — fetches any public repo, runs AI-powered summary, workflow, Q&A, and doc generation through Groq (Llama 3.3 70B)
2. **Local directory scan** — walks a local folder, parses import statements, counts LoC, and returns a nodes + edges graph for the frontend to render

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
| `GROQ_API_KEY` | Yes | Groq API key — free tier at [console.groq.com](https://console.groq.com) |
| `GITHUB_TOKEN` | No | Raises GitHub rate limit from 60 to 5,000 req/hr |
| `DEBUG` | No | Verbose logging (default: `true`) |
| `CORS_ORIGINS` | No | JSON array of allowed frontend origins |

---

## API Reference

Base URL: `http://localhost:8001`  
All endpoints accept and return `application/json`.

---

### `POST /api/analyze`

Full GitHub repository analysis. Fetches files, runs summary + workflow through Groq, and caches for 1 hour.

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
    "key_features": ["Auto OpenAPI docs", "Async support"]
  },
  "workflow": {
    "repo": "tiangolo/fastapi",
    "architecture_pattern": "Library / Framework",
    "entry_points": ["fastapi/applications.py"],
    "data_flow": "1. Request hits Uvicorn...",
    "components": [{ "name": "Router", "description": "...", "key_files": ["fastapi/routing.py"] }],
    "notable_patterns": ["Dependency injection"]
  }
}
```

---

### `GET /api/analyze/{owner}/{repo}`

Returns a previously cached analysis without re-fetching. Returns `404` if not yet analyzed this session.

---

### `POST /api/summary`

Returns only the summary portion. Uses cache if available; otherwise fetches + generates just the summary.

**Request** — `{ "repo_url": "..." }`  
**Response** — `SummaryResult` (same shape as `analysis.summary`)

---

### `POST /api/workflow`

Returns only the workflow/architecture analysis.

**Request** — `{ "repo_url": "..." }`  
**Response** — `WorkflowResult` (same shape as `analysis.workflow`)

---

### `POST /api/chat`

Q&A against a GitHub repo. Sends conversation history + source files to Groq and returns an answer with file citations. If file cache has expired, files are re-fetched automatically.

**Request**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "messages": [
    { "role": "user", "content": "How does authentication work?" }
  ]
}
```

Pass the full conversation history — the model uses the last 10 messages as context.

**Response**
```json
{
  "answer": "Authentication is handled via `OAuth2PasswordBearer`...",
  "cited_files": ["fastapi/security/oauth2.py"]
}
```

---

### `POST /api/generate-doc`

Generates a full Markdown document about the repository.

**Request**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "doc_type": "onboarding",
  "custom_prompt": ""
}
```

| `doc_type` | What it generates |
|---|---|
| `onboarding` | New engineer guide: setup, key concepts, where to start |
| `architecture` | System design doc: components, data models, decisions |
| `api` | Full API reference auto-generated from source code |
| `security` | Security audit: auth flows, input validation, risks |
| `custom` | Anything — describe in `custom_prompt` |

**Response**
```json
{ "doc_type": "onboarding", "content": "# FastAPI — Onboarding Guide\n..." }
```

---

### `POST /api/scan`

Walks a **local directory**, parses import/include statements without running the code, and returns a graph of nodes (files) and edges (imports).

**Request**
```json
{ "path": "C:\\Users\\you\\projects\\my-app" }
```

**Response**
```json
{
  "root": "C:\\Users\\you\\projects\\my-app",
  "file_count": 24,
  "nodes": [
    { "id": "src/main.py", "label": "main.py", "path": "src/main.py", "language": "Python", "loc": 82, "size_bytes": 2048 }
  ],
  "edges": [
    { "id": "src/main.py__src/utils.py", "source": "src/main.py", "target": "src/utils.py" }
  ]
}
```

**Supported languages:**

| Language | Detected syntax |
|---|---|
| Python | `import X`, `from X import Y`, relative imports |
| JS / JSX / TS / TSX | `import X from './Y'`, `require('./Y')` — local paths only |
| C / C++ / headers | `#include "file.h"` |

**Skipped automatically:** `node_modules`, `.git`, `__pycache__`, `venv`, `dist`, `build`, `.next`, `target`, etc.  
**Max file size:** 512 KB per file.

---

### `POST /api/explain`

Reads a file from disk and returns a 3-sentence plain-English explanation of what it does, powered by Groq (Llama 3.3 70B). Called when the user clicks a node in the graph.

**Request**
```json
{ "path": "C:\\Users\\you\\projects\\my-app\\src\\main.py", "content": "" }
```

Pass `content` if you already have it; leave it empty and the backend reads the file directly from `path`.

**Response**
```json
{
  "explanation": "This file defines the FastAPI application entry point and registers all routers. It configures CORS middleware to allow requests from the frontend dev server. The `health` endpoint at `/health` is used for uptime monitoring."
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
├── schemas.py           # All request/response Pydantic models
├── requirements.txt
├── .env.example
├── routers/
│   ├── analyze.py       # POST /api/analyze, GET /api/analyze/{owner}/{repo}
│   ├── summary.py       # POST /api/summary
│   ├── workflow.py      # POST /api/workflow
│   ├── chat.py          # POST /api/chat
│   ├── docs.py          # POST /api/generate-doc
│   ├── scan.py          # POST /api/scan  ← local directory scan
│   └── explain.py       # POST /api/explain  ← click-to-explain
└── services/
    ├── github.py        # GitHub API + file fetching logic
    ├── claude.py        # All Groq/Llama prompts + response parsing
    └── cache.py         # In-memory TTL cache (1 hr)
```

---

## Key Design Decisions

**Import parsing is static, not runtime**
The scan endpoint uses regex to extract import paths. It resolves relative imports against the file's location and tries common extension suffixes. External package imports (anything that doesn't resolve to a file in the repo) are silently dropped — only local file-to-file edges appear in the graph.

**explain reads from disk, not from the frontend**
The frontend passes the absolute file path (constructed from the scan root + relative path). The explain endpoint reads the file itself, so it never needs the frontend to transfer large file contents over the network. If `content` is provided anyway, it's used as-is.

**File selection for GitHub analysis is priority-ranked**
The GitHub service ranks files: README → package manifests → entry points → config files → model/router files. Binary files, lock files, and common build artifacts are always skipped. Capped at 60 files / 500 KB total.

**Two separate caches**
`analysis_cache` stores the structured `AnalysisResult`. `files_cache` stores the raw file dict. Chat and doc generation reuse fetched files without hitting GitHub again, even if called independently of `/api/analyze`.

**LLM responses are JSON-parsed into Pydantic models**
Summary and workflow prompts instruct the model to return strict JSON. The service strips markdown fences before parsing. Chat falls back to returning the raw text if JSON parsing fails.

**Cache is in-memory (1 hr TTL)**
Fast for development, stateless. In production this should be Redis or a database-backed cache to survive restarts and scale across workers.

---

## Error Codes

| Status | Meaning |
|---|---|
| `404` | Path not found on disk, or no cached analysis for this GitHub repo |
| `422` | Invalid GitHub URL, empty path, missing required fields |
| `502` | GitHub API error or Groq API error (details in `detail` field) |
