import httpx
import base64
import asyncio
from pathlib import PurePosixPath

# Files/dirs to always skip
SKIP_DIRS = {
    "node_modules", ".git", "dist", "build", ".next", "__pycache__",
    ".venv", "venv", "env", "vendor", "target", ".idea", ".vscode",
    "coverage", ".nyc_output", "eggs", ".eggs", "site-packages",
    ".tox", ".pytest_cache", ".mypy_cache", ".ruff_cache",
}
SKIP_EXTENSIONS = {
    # Images / media
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".wav",
    # Archives / binaries
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar",
    # Lock files
    ".lock",
    # ML / data artefacts
    ".pkl", ".pickle", ".joblib", ".pt", ".pth", ".onnx", ".h5", ".bin",
    # Large data files
    ".jsonl", ".parquet", ".csv", ".tsv", ".npy", ".npz", ".db", ".sqlite",
}

# High-priority file patterns (checked in order)
PRIORITY_PATTERNS = [
    # Docs / entry metadata
    lambda p: p.name.lower() in {"readme.md", "readme.rst", "readme.txt", "readme"},
    # Package / dependency manifests
    lambda p: p.name in {
        "package.json", "requirements.txt", "pyproject.toml",
        "Cargo.toml", "go.mod", "pom.xml", "build.gradle",
        "composer.json", "Gemfile", "mix.exs",
    },
    # Infrastructure / config
    lambda p: p.name in {
        "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
        ".env.example", "nginx.conf", "vercel.json", "railway.toml",
    },
    # Main entry points
    lambda p: p.stem in {
        "main", "app", "server", "index", "cli", "manage", "wsgi", "asgi",
    } and p.suffix in {".py", ".js", ".ts", ".go", ".rs", ".rb", ".java"},
    # Config files
    lambda p: p.name in {
        "vite.config.js", "vite.config.ts", "webpack.config.js",
        "tailwind.config.js", "tsconfig.json", "jest.config.js",
        "next.config.js", "next.config.ts",
    },
    # Schema / model files
    lambda p: any(kw in p.stem.lower() for kw in ("model", "schema", "type", "entity")),
    # Router / controller files
    lambda p: any(kw in p.stem.lower() for kw in ("router", "route", "controller", "handler")),
]

MAX_FILES = 20
MAX_FILE_BYTES = 8_000    # ~2k tokens per file
MAX_TOTAL_BYTES = 80_000  # ~20k tokens total — safe for Groq free tier


def _priority(path_str: str) -> int:
    """Lower number = higher priority."""
    p = PurePosixPath(path_str)
    for i, check in enumerate(PRIORITY_PATTERNS):
        if check(p):
            return i
    return len(PRIORITY_PATTERNS)


def _should_skip(path_str: str) -> bool:
    p = PurePosixPath(path_str)
    parts = set(p.parts)
    if parts & SKIP_DIRS:
        return True
    if p.suffix.lower() in SKIP_EXTENSIONS:
        return True
    if p.name.startswith(".") and p.name not in {".env.example"}:
        return True
    return False


class GitHubService:
    BASE = "https://api.github.com"
    RAW = "https://raw.githubusercontent.com"

    def __init__(self, token: str = ""):
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._headers = headers

    async def get_repo_meta(self, owner: str, repo: str) -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{self.BASE}/repos/{owner}/{repo}", headers=self._headers)
            if r.status_code == 404:
                raise ValueError(f"Repository {owner}/{repo} not found or is private")
            r.raise_for_status()
            return r.json()

    async def get_file_tree(self, owner: str, repo: str, branch: str = "HEAD") -> list[str]:
        """Returns list of all file paths in the repo."""
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{self.BASE}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
                headers=self._headers,
            )
            if r.status_code == 409:   # empty repo
                return []
            r.raise_for_status()
            data = r.json()
            return [item["path"] for item in data.get("tree", []) if item["type"] == "blob"]

    async def fetch_file(self, owner: str, repo: str, path: str, branch: str = "HEAD") -> str | None:
        url = f"{self.RAW}/{owner}/{repo}/{branch}/{path}"
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                r = await client.get(url, headers={"User-Agent": "codebase-lens"})
                if r.status_code != 200:
                    return None
                content = r.text
                if len(content.encode()) > MAX_FILE_BYTES:
                    content = content[: MAX_FILE_BYTES] + "\n... [truncated]"
                return content
            except Exception:
                return None

    async def fetch_relevant_files(self, owner: str, repo: str) -> dict[str, str]:
        """Fetch the most signal-rich files, up to MAX_FILES / MAX_TOTAL_BYTES."""
        all_paths = await self.get_file_tree(owner, repo)

        # Filter and rank
        candidates = [p for p in all_paths if not _should_skip(p)]
        candidates.sort(key=_priority)
        candidates = candidates[:MAX_FILES]

        # Fetch concurrently in batches of 10
        result: dict[str, str] = {}
        total_bytes = 0

        async def _fetch(path: str):
            nonlocal total_bytes
            if total_bytes >= MAX_TOTAL_BYTES:
                return
            content = await self.fetch_file(owner, repo, path)
            if content:
                total_bytes += len(content.encode())
                result[path] = content

        for i in range(0, len(candidates), 10):
            batch = candidates[i: i + 10]
            await asyncio.gather(*[_fetch(p) for p in batch])
            if total_bytes >= MAX_TOTAL_BYTES:
                break

        return result
