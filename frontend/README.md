# Codebase Lens — Frontend

React + Vite frontend for Codebase Lens. Supports two modes:

- **GitHub Repo** — paste a URL, get AI-generated summary, workflow analysis, and a chat interface
- **Local Scan** — paste a directory path, get an interactive React Flow dependency graph with click-to-explain

---

## Quick Start

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Backend must be running on `http://localhost:8001` (or set `VITE_API_URL`).

---

## Environment Variables

Create `frontend/.env` (gitignored):

```env
VITE_API_URL=http://localhost:8001
```

Defaults to `http://localhost:8001` if not set.

---

## Pages

### `/` — Home

- Mode toggle: **GitHub Repo** / **Local Scan**
- **GitHub mode:** URL input (`https://github.com/owner/repo` or `owner/repo`), feature selector (Summary / Workflow / Ask Chat), Analyze button → navigates to `/analysis`
- **Local mode:** absolute path input, Scan & Visualise button → navigates to `/graph`

### `/analysis` — GitHub Analysis

- Top bar: back arrow, repo slug, Ready badge, theme toggle, Chat button
- Two-column card grid for selected features:
  - **Summary card** — purpose prose, tech stack badges, key features list
  - **Workflow card** — architecture pattern badge, entry points, data flow description
- Each card has a loading spinner and error state
- **Chat panel** — slides in from the right
  - Full conversation against the repo, powered by `/api/chat`
  - Shows cited file paths under each assistant reply
  - Backdrop click or ✕ closes it

### `/graph` — Local Dependency Graph

- Full-screen **React Flow** canvas
- Nodes auto-arranged with **dagre** (left-to-right dependency ranking)
- **File nodes**: filename, language badge (colour-coded), lines of code count — fully draggable
- **Edges**: smooth-step arrows from importer to imported file
- **Minimap** (bottom-right) and **zoom controls** (bottom-left)
- **Click any node** → Explain panel slides in from the right:
  - File name, language, LoC, size
  - Relative path
  - AI-generated 3-sentence plain-English explanation (Groq / Llama)
  - Click backdrop or ✕ to close

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| React | 19 | Component model, hooks |
| Vite | 8 | Fast dev server, ESM-native build |
| React Router | v7 | Client-side routing (`/`, `/analysis`, `/graph`) |
| Tailwind CSS | v3 | Utility-first styling, dark mode via `class` strategy |
| `@xyflow/react` | 12 | React Flow — interactive graph canvas |
| `@dagrejs/dagre` | — | Automatic graph layout (left-to-right, ranked) |
| Axios | 1.x | HTTP client, 120s timeout |
| Lucide React | 1.x | Icon set |

---

## Project Structure

```
frontend/
├── index.html                     # Sets <html class="dark"> — dark mode default
├── vite.config.js
├── tailwind.config.js             # darkMode: 'class', accent token definitions
├── src/
│   ├── main.jsx                   # BrowserRouter wrapper
│   ├── App.jsx                    # ThemeProvider + route definitions (/, /analysis, /graph)
│   ├── index.css                  # Tailwind directives + global utility classes
│   ├── context/
│   │   └── ThemeContext.jsx       # dark state + toggle(), syncs to <html> class
│   ├── components/
│   │   └── Navbar.jsx             # Reusable navbar
│   ├── api/
│   │   ├── client.js              # Axios instance — base URL from VITE_API_URL
│   │   └── index.js               # All API functions
│   └── pages/
│       ├── Home.jsx               # Mode toggle + GitHub / Local forms
│       ├── Analysis.jsx           # Summary + Workflow cards + Chat panel
│       └── Graph.jsx              # React Flow canvas + Explain panel
```

---

## API Integration

All calls go through `src/api/index.js`:

```js
// GitHub repo analysis
analyzeRepo(repo_url)                           // POST /api/analyze
getSummary(repo_url)                            // POST /api/summary
getWorkflow(repo_url)                           // POST /api/workflow
sendChat(repo_url, messages)                    // POST /api/chat
generateDoc(repo_url, doc_type, custom_prompt)  // POST /api/generate-doc

// Local directory graph
scanDirectory(path)                             // POST /api/scan
explainFile(path, content)                      // POST /api/explain
```

The axios client has a **120-second timeout** — GitHub analysis (fetch + two Groq calls) can take 30–60 seconds on large repos.

---

## Theme System

Dark mode uses Tailwind's `class` strategy:

- `<html class="dark">` set in `index.html` — dark is the default on first load
- `ThemeContext` holds a `dark` boolean; toggle syncs to `document.documentElement.classList`
- Graph nodes read `document.documentElement.classList.contains('dark')` directly since they're outside the React style system

**Custom CSS classes (in `index.css`):**

| Class | Effect |
|---|---|
| `.gradient-btn` | Purple → pink gradient background, hover brightness + glow |
| `.gradient-text` | Purple → pink gradient applied to text |
| `.surface-card` | White / dark surface with border and shadow |
| `.input-wrap` | Focus-within ring in accent-purple |
| `.feature-tab` | Toggleable pill — plain or active (purple tint) |

**Language colours (in `Graph.jsx`):** Python → blue, JS → gold, React → cyan, TypeScript → blue, Go → teal, Rust → red, etc.

---

## Scripts

```bash
npm run dev      # Dev server on :5173 with HMR
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # oxlint
```
