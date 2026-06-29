# Codebase Lens

> Two ways in. Total understanding.

Codebase Lens is an AI-powered tool that helps you understand any codebase — paste a GitHub URL for a full AI-driven analysis, or point it at a local directory to get an interactive dependency graph you can explore and drag around.

---

## What It Does

### Mode 1 — GitHub Repo Analysis

Paste any public GitHub URL. The backend fetches every relevant source file, feeds them to Groq (Llama 3.3 70B), and returns:

- **Summary** — what the project does, its tech stack, and key features
- **Workflow** — architecture pattern, entry points, and how a request flows through the system
- **Ask / Chat** — Q&A in plain English with exact file and line citations
- **Doc Generator** — full Markdown documents: onboarding guide, architecture doc, API reference, security audit, or custom

### Mode 2 — Local Directory Scan + Graph

Point it at any local folder. The backend walks the directory tree, parses import/include statements without running the code, and returns a graph. The frontend renders it as an interactive canvas:

- **File nodes** — draggable, colour-coded by language, showing name and lines of code
- **Dependency edges** — arrows from each file to every file it imports
- **Click any node** — a side panel slides in with a 3-sentence AI explanation of that file
- **Dagre auto-layout** — nodes are automatically arranged left-to-right by dependency rank
- **Minimap + zoom controls** — navigate large repos with ease

---

## Supported Languages (Local Scan)

| Language | Import syntax detected |
|---|---|
| Python | `import X`, `from X import Y`, relative imports (`from .X import Y`) |
| JavaScript / JSX | `import X from './Y'`, `require('./Y')` |
| TypeScript / TSX | Same as JS |
| C / C++ | `#include "file.h"` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| AI / LLM | Groq — `llama-3.3-70b-versatile` (free tier) |
| GitHub access | GitHub REST API |
| Frontend | React 19, Vite 8 |
| Graph visualisation | React Flow (`@xyflow/react`), Dagre layout (`@dagrejs/dagre`) |
| Styling | Tailwind CSS v3 |
| HTTP client | Axios |
| Cache | In-memory TTL (1 hr) |

---

## Architecture

```
User
 |
 |── GitHub URL ──► [Frontend] ──► POST /api/analyze
 |                                      |
 |                                      ├─ GitHub API → fetch files
 |                                      ├─ Groq → summary JSON
 |                                      └─ Groq → workflow JSON
 |
 |── Local path ──► [Frontend] ──► POST /api/scan
                                        |
                                        ├─ os.walk → parse imports
                                        ├─ count LoC per file
                                        └─ return nodes + edges JSON
                                              |
                                              ▼
                                    React Flow canvas
                                    (dagre layout, click-to-explain)
                                              |
                                    node click ──► POST /api/explain
                                                        |
                                                        └─ Groq → 3-sentence summary
```

---

## Project Structure

```
codebase-lens/
├── backend/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── config.py            # Pydantic settings (reads .env)
│   ├── schemas.py           # All request/response models
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── analyze.py       # POST /api/analyze (GitHub repo)
│   │   ├── summary.py       # POST /api/summary
│   │   ├── workflow.py      # POST /api/workflow
│   │   ├── chat.py          # POST /api/chat
│   │   ├── docs.py          # POST /api/generate-doc
│   │   ├── scan.py          # POST /api/scan (local directory)
│   │   └── explain.py       # POST /api/explain (click-to-explain)
│   └── services/
│       ├── github.py        # GitHub API + file fetching
│       ├── claude.py        # All Groq/Llama prompts
│       └── cache.py         # In-memory TTL cache
└── frontend/
    ├── src/
    │   ├── App.jsx           # Routes: / /analysis /graph
    │   ├── context/
    │   │   └── ThemeContext.jsx
    │   ├── api/
    │   │   ├── client.js     # Axios instance
    │   │   └── index.js      # All API calls
    │   └── pages/
    │       ├── Home.jsx      # Mode toggle: GitHub / Local Scan
    │       ├── Analysis.jsx  # Summary + Workflow cards + Chat panel
    │       └── Graph.jsx     # React Flow canvas + Explain panel
    └── ...
```

---

## Getting Started

**Prerequisites:** Python 3.11+, Node.js 18+, a free [Groq API key](https://console.groq.com).

```bash
git clone https://github.com/aishna05/codebase-lens.git
cd codebase-lens

# Backend
cd backend
cp .env.example .env        # add GROQ_API_KEY (and optionally GITHUB_TOKEN)
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

### GitHub mode

1. Open `http://localhost:5173`
2. Select "GitHub Repo"
3. Paste any public GitHub URL — e.g. `https://github.com/fastapi/fastapi`
4. Choose Summary / Workflow / Chat as needed, click **Analyze**

### Local scan mode

1. Open `http://localhost:5173`
2. Select "Local Scan"
3. Paste an absolute path — e.g. `C:\Users\you\projects\my-app`
4. Click **Scan & Visualise**
5. Drag nodes, zoom with scroll, click any file node to get an AI explanation

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq key — free at [console.groq.com](https://console.groq.com) |
| `GITHUB_TOKEN` | No | Raises GitHub rate limit from 60 to 5,000 req/hr |
| `CORS_ORIGINS` | No | JSON array of allowed origins (default: localhost:5173 + :3000) |

---

## License

MIT
