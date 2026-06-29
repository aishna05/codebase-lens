import os
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException
from ..schemas import ScanRequest, ScanResult, FileNode, DependencyEdge

router = APIRouter(prefix="/scan", tags=["scan"])

SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "out", "target", ".idea",
    ".vscode", "coverage", ".pytest_cache", ".mypy_cache", ".tox",
    ".cache", "vendor", "bower_components",
}

LANG_MAP = {
    ".py":     "Python",
    ".js":     "JavaScript",
    ".jsx":    "React",
    ".ts":     "TypeScript",
    ".tsx":    "React/TS",
    ".c":      "C",
    ".cpp":    "C++",
    ".cc":     "C++",
    ".cxx":    "C++",
    ".h":      "C/C++",
    ".hpp":    "C++",
    ".go":     "Go",
    ".rs":     "Rust",
    ".java":   "Java",
    ".kt":     "Kotlin",
    ".rb":     "Ruby",
    ".php":    "PHP",
    ".cs":     "C#",
    ".swift":  "Swift",
    ".vue":    "Vue",
    ".svelte": "Svelte",
}

PARSEABLE = set(LANG_MAP.keys())
MAX_FILE_SIZE = 512 * 1024  # 512 KB


def _norm(path: str) -> str:
    return path.replace("\\", "/")


def detect_imports(content: str, ext: str, rel_path: str, all_rel: set[str]) -> list[str]:
    file_dir = _norm(str(Path(rel_path).parent))
    if file_dir == ".":
        file_dir = ""
    found = []

    if ext == ".py":
        for m in re.finditer(
            r"^\s*from\s+(\.+[\w.]*|[\w.]+)\s+import|^\s*import\s+([\w.]+)",
            content, re.MULTILINE
        ):
            mod = (m.group(1) or m.group(2) or "").strip()
            if mod.startswith("."):
                dots = len(mod) - len(mod.lstrip("."))
                mod_name = mod.lstrip(".")
                base = Path(file_dir) if file_dir else Path(".")
                for _ in range(dots - 1):
                    base = base.parent
                resolved = _norm(str(base / mod_name.replace(".", "/"))) if mod_name else _norm(str(base))
                candidates = [resolved + ".py", resolved + "/__init__.py"]
            else:
                mod_path = mod.replace(".", "/")
                candidates = [mod_path + ".py", mod_path + "/__init__.py"]

            for c in candidates:
                if c in all_rel:
                    found.append(c)
                    break

    elif ext in (".js", ".jsx", ".ts", ".tsx"):
        for m in re.finditer(
            r"""(?:import\s+(?:[^'"]*?\s+from\s+)?|require\s*\(\s*)['"](\.[^'"]+)['"]""",
            content
        ):
            spec = m.group(1)
            if file_dir:
                resolved = _norm(os.path.normpath(os.path.join(file_dir, spec)))
            else:
                resolved = _norm(os.path.normpath(spec))
            candidates = [
                resolved,
                resolved + ".js",  resolved + ".jsx",
                resolved + ".ts",  resolved + ".tsx",
                resolved + "/index.js",  resolved + "/index.jsx",
                resolved + "/index.ts",  resolved + "/index.tsx",
            ]
            for c in candidates:
                if c in all_rel:
                    found.append(c)
                    break

    elif ext in (".c", ".cpp", ".cc", ".cxx", ".h", ".hpp"):
        for m in re.finditer(r'#include\s+"([^"]+)"', content):
            included = m.group(1)
            if file_dir:
                resolved = _norm(os.path.normpath(os.path.join(file_dir, included)))
            else:
                resolved = _norm(included)
            if resolved in all_rel:
                found.append(resolved)

    return list(set(found))


@router.post("", response_model=ScanResult)
def scan_directory(body: ScanRequest):
    root = Path(body.path)
    if not root.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {body.path}")
    if not root.is_dir():
        raise HTTPException(status_code=422, detail="Path must be a directory")

    nodes: list[FileNode] = []
    all_rel: set[str] = set()
    file_contents: dict[str, str] = {}

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIRS and not d.startswith(".")
        ]
        for fname in filenames:
            fpath = Path(dirpath) / fname
            ext = fpath.suffix.lower()
            if ext not in PARSEABLE:
                continue
            rel_str = _norm(str(fpath.relative_to(root)))
            try:
                stat = fpath.stat()
                if stat.st_size > MAX_FILE_SIZE:
                    continue
                content = fpath.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            loc = sum(1 for line in content.splitlines() if line.strip())
            nodes.append(FileNode(
                id=rel_str,
                label=fname,
                path=rel_str,
                language=LANG_MAP.get(ext, ext.lstrip(".")),
                loc=loc,
                size_bytes=stat.st_size,
            ))
            all_rel.add(rel_str)
            file_contents[rel_str] = content

    edges: list[DependencyEdge] = []
    seen: set[tuple[str, str]] = set()
    for node in nodes:
        ext = Path(node.path).suffix.lower()
        for target in detect_imports(file_contents[node.id], ext, node.path, all_rel):
            if target != node.id and (node.id, target) not in seen:
                seen.add((node.id, target))
                edges.append(DependencyEdge(
                    id=f"{node.id}__{target}",
                    source=node.id,
                    target=target,
                ))

    return ScanResult(nodes=nodes, edges=edges, root=str(root), file_count=len(nodes))
