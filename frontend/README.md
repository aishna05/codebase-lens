# Codebase Lens — Frontend

React + Vite frontend for the Codebase Lens platform. Lets users drop a GitHub URL, select which features they want, and view AI-generated analysis in a clean two-column layout.

---

## Quick Start

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Make sure the backend is running on `http://localhost:8001` (or set `VITE_API_URL` in a `.env` file).

---

## Environment Variables

Create `frontend/.env` (already gitignored):

```env
VITE_API_URL=http://localhost:8001
```

Defaults to `http://localhost:8001` if not set.

---

## Pages

### `/` — Home

- Logo + dark/light toggle in navbar
- Centered headline: **"Drop your URL"** / **"Get the full context"**
- URL input — accepts `https://github.com/owner/repo` or `owner/repo` shorthand
- Three selectable feature boxes: **Summary**, **Workflow**, **Ask / Chat**
  - At least one must stay selected at all times
  - Selection is passed to the analysis page via query params (`?features=summary,workflow,chat`)
- Analyze button — validates URL then navigates to `/analysis`

### `/analysis` — Analysis

- Top bar: GitHub repo URL (left) + theme toggle + Chat button (right)
- Two-column box grid showing results for the selected features
  - **Summary box** — purpose, tech stack badges, key features list
  - **Workflow box** — architecture pattern, entry points, data flow
- Each box has its own loading spinner and error state
- **Chat panel** — slides in from the right when Chat is clicked
  - Full conversation with the codebase, powered by `/api/chat`
  - Shows cited file references under each assistant response
  - Backdrop click or ✕ closes it

---

## Tech Stack

| Tool | Version | Why |
|---|---|---|
| React | 18 | Component model, hooks |
| Vite | 8 | Fast dev server, ESM-native build |
| React Router | v6 | Client-side routing |
| Tailwind CSS | v3 | Utility-first, dark mode via `class` strategy |
| Axios | 1.x | HTTP client, 120s timeout for slow analysis calls |
| Lucide React | 0.4x | Icon set |

---

## Project Structure

```
frontend/
├── index.html                  # Sets <html class="dark"> — dark mode default
├── vite.config.js
├── tailwind.config.js          # darkMode: 'class', neon-pink / neon-purple tokens
├── src/
│   ├── main.jsx                # BrowserRouter wrapper
│   ├── App.jsx                 # ThemeProvider + route definitions
│   ├── index.css               # Tailwind directives + global utility classes
│   ├── context/
│   │   └── ThemeContext.jsx    # Dark state, toggle(), syncs to <html> class
│   ├── components/
│   │   └── Navbar.jsx          # Reusable navbar with toggle button
│   ├── api/
│   │   ├── client.js           # Axios instance — base URL from VITE_API_URL
│   │   └── index.js            # All API functions (analyzeRepo, sendChat, etc.)
│   └── pages/
│       ├── Home.jsx            # Landing page: URL input + feature selector
│       └── Analysis.jsx        # Results grid + sliding chat panel
```

---

## Theme System

Dark mode uses Tailwind's `class` strategy:

- `<html class="dark">` set in `index.html` so dark is the default on first load
- `ThemeContext` holds a `dark` boolean in React state
- Toggle calls `document.documentElement.classList.toggle('dark', dark)`
- All components use `dark:` Tailwind variants

**Custom color tokens (in `tailwind.config.js`):**

| Token | Hex | Used for |
|---|---|---|
| `neon-pink` | `#e879f9` | Active states, borders, chat bubbles, CTA buttons |
| `neon-purple` | `#a855f7` | Code blocks, workflow badges, secondary accents |

**Global CSS classes (in `index.css`):**

| Class | Effect |
|---|---|
| `.neon-text` | Pink → purple gradient on text |
| `.neon-btn` | Pink → purple gradient background |
| `.neon-glow` | Soft box-shadow glow for selected elements |
| `.neon-border` | Focus-within glow on input containers |

---

## API Integration

All calls go through `src/api/index.js`:

```js
analyzeRepo(repo_url)                           // POST /api/analyze
getSummary(repo_url)                            // POST /api/summary
getWorkflow(repo_url)                           // POST /api/workflow
sendChat(repo_url, messages)                    // POST /api/chat
generateDoc(repo_url, doc_type, custom_prompt)  // POST /api/generate-doc
```

The axios client has a **120-second timeout** — repo analysis (GitHub fetch + two Claude calls) can take 30–60 seconds on large repos.

---

## Scripts

```bash
npm run dev      # Dev server on :5173 with HMR
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```
