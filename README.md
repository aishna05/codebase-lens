# Codebase Lens

> Paste a GitHub URL. Understand everything.

Codebase Lens is an AI-powered platform that ingests any public GitHub repository and gives you a complete, living understanding of it — what it does, how it works, and why it was built that way. Ask questions in plain English, get precise answers with code references, and export a full technical document in one click.

---

## The Problem

Reading a new codebase is slow. You scan file trees, grep for entry points, chase import chains, and still miss the big picture. Documentation is usually outdated, sparse, or missing. Onboarding a new engineer to a large repo can take weeks. Understanding an open-source library deeply enough to contribute can take days.

Codebase Lens solves this in minutes.

---

## How It Works

### Step 1 — Paste a GitHub URL

Enter any public GitHub repository URL (e.g. `https://github.com/fastapi/fastapi`). No setup, no cloning, no config.

### Step 2 — The Agent Ingests the Repo

The agent fetches the repository tree and reads every file that matters — source code, configs, package files, CI definitions, and existing docs. It builds a structured understanding of:

- The tech stack and dependencies
- The entry points and main execution paths
- Module/package structure and how components relate
- Data models and schemas
- API surfaces (REST, GraphQL, CLI, etc.)
- Tests and what they cover
- Infrastructure and deployment setup

### Step 3 — Get an Instant Summary

Without you asking anything, the platform generates:

- A plain-English summary of what the project does
- A workflow diagram showing how data/requests flow through the system
- A component map showing how the major pieces fit together
- Key design decisions and architectural patterns detected

### Step 4 — Ask Anything

A chat interface lets you ask questions about the repo in natural language. The agent answers with code references, line numbers, and explanations.

Examples:
- "How does authentication work in this project?"
- "Where is the database schema defined?"
- "What happens when a user submits the checkout form?"
- "Which files would I need to touch to add a new API endpoint?"
- "Are there any obvious security issues?"
- "Explain the worker queue setup."

### Step 5 — Generate a Full Document

Prompt the agent to produce a complete technical document tailored to your needs. Choose a document type or describe exactly what you want:

- **Onboarding Guide** — for a new engineer joining the team
- **Architecture Doc** — for a technical design review
- **API Reference** — auto-generated from the codebase
- **Security Audit Summary** — potential vulnerabilities and risky patterns
- **Custom** — describe any document in plain English and the agent writes it

Export as Markdown, PDF, or Notion page.

---

## Core Features

| Feature | Description |
|---|---|
| Repo Ingestion | Fetches and indexes any public GitHub repo via URL |
| Auto Summary | Plain-English overview generated on ingest |
| Workflow Analysis | Traces request/data flow through the codebase |
| Q&A Chat | Ask anything about the repo, get answers with code citations |
| Document Generator | Produces full technical docs from a prompt |
| Multi-file Context | Agent reasons across the entire repo, not just one file |
| Stack Detection | Automatically identifies languages, frameworks, and tools |
| Diff Analysis | (Planned) Point to a PR or commit and understand what changed and why |
| Private Repo Support | (Planned) Connect via GitHub OAuth for private repositories |

---

## Architecture

```
User
 |
 | GitHub URL
 v
[Frontend — React/Next.js]
 |
 | API call
 v
[Backend — FastAPI]
 |
 |-- Repo Fetcher ---------> GitHub API / git clone
 |                               |
 |                               | raw files
 |                               v
 |-- Indexer / Chunker -----> splits files into semantic chunks
 |                               |
 |                               v
 |-- Vector Store ----------> embeddings (pgvector / Pinecone)
 |
 |-- Agent (Groq — Llama 3.3 70B) -> reads relevant chunks + full context
 |       |
 |       |-- /summarize     -> instant project overview
 |       |-- /chat          -> Q&A with code citations
 |       |-- /generate-doc  -> full document output
 |
 v
[Response to User]
```

### Key Components

**Repo Fetcher**
Uses the GitHub API to fetch the file tree and download file contents. Respects rate limits and skips binary files, build artifacts, and lock files. For large repos, prioritizes high-signal files (entry points, models, routers, configs).

**Indexer / Chunker**
Splits source files into semantically meaningful chunks — by function, class, or logical block rather than fixed token windows. Attaches metadata: file path, language, line range.

**Vector Store**
Embeds chunks and stores them for retrieval. On each query, the most relevant chunks are fetched and passed to the agent as context.

**Agent (Groq — Llama 3.3 70B)**
The core reasoning layer. Given retrieved context and the full repo structure, it answers questions, traces workflows, and writes documents. Uses tool calls to fetch additional file content on demand when a question requires deeper context than what retrieval surfaces.

**Document Generator**
Takes a document-type prompt and orchestrates a multi-step generation: outline first, then section by section, stitching into a coherent final document. Includes auto-linked code references throughout.

---

## Tech Stack (Planned)

| Layer | Technology |
|---|---|
| Frontend | Next.js, TailwindCSS |
| Backend | FastAPI (Python) |
| Agent | Groq (llama-3.3-70b-versatile, free tier) |
| Embeddings | OpenAI embeddings (planned) |
| Vector Store | pgvector (PostgreSQL) |
| Repo Access | GitHub REST API |
| Auth | GitHub OAuth |
| Export | Markdown, PDF (via Pandoc) |
| Deployment | Docker, Railway / Render |

---

<!-- ## Roadmap

**Phase 1 — Core**
- [ ] GitHub URL ingestion (public repos)
- [ ] Instant repo summary
- [ ] Q&A chat with code citations
- [ ] Basic document generation (onboarding, architecture)

**Phase 2 — Depth**
- [ ] Workflow / data-flow diagram generation
- [ ] Diff analysis (PR / commit understanding)
- [ ] Security audit document type
- [ ] Export to PDF and Notion

**Phase 3 — Scale**
- [ ] Private repo support via GitHub OAuth
- [ ] Saved sessions (revisit a repo without re-ingesting)
- [ ] Team workspaces (shared Q&A history, docs)
- [ ] Webhook integration (auto-update on push) -->

---

## Getting Started (Development)

> Setup instructions will be added as the stack is built out.

```bash
# Clone the repo
git clone https://github.com/aishna05/codebase-lens.git
cd codebase-lens

# Backend
cd backend
cp .env.example .env   # fill in GROQ_API_KEY, GITHUB_TOKEN
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## License

MIT
