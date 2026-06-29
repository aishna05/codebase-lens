import json
from groq import Groq
from ..schemas import SummaryResult, WorkflowResult, Component, TechItem, ChatResponse, DocResponse

MODEL = "llama-3.3-70b-versatile"   # 128k context window
MAX_TOKENS = 4096


def _format_files(files: dict[str, str]) -> str:
    parts = []
    for path, content in files.items():
        parts.append(f"### FILE: {path}\n```\n{content}\n```")
    return "\n\n".join(parts)


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


class ClaudeService:
    def __init__(self, api_key: str):
        self._client = Groq(api_key=api_key)

    def _call(self, system: str, user: str) -> str:
        response = self._client.chat.completions.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
        )
        content = response.choices[0].message.content
        if not content:
            reason = response.choices[0].finish_reason
            raise RuntimeError(f"Model returned empty response (finish_reason={reason})")
        return content

    # ── Summary ───────────────────────────────────────────────────────────────

    def generate_summary(self, repo: str, files: dict[str, str]) -> SummaryResult:
        system = """You are a senior software engineer analyzing a GitHub repository.
Given a set of source files, produce a concise and accurate summary.
Return ONLY valid JSON — no markdown, no explanation:
{
  "language": "primary programming language",
  "description": "one sentence description",
  "purpose": "2-3 sentences on what problem this solves and for whom",
  "tech_stack": [{"name": "...", "role": "..."}, ...],
  "key_features": ["feature 1", "feature 2", ...]
}"""
        user = f"Repository: {repo}\n\nFiles:\n{_format_files(files)}"
        data = json.loads(_strip_fences(self._call(system, user)))
        return SummaryResult(
            repo=repo,
            language=data.get("language", "Unknown"),
            description=data.get("description", ""),
            purpose=data.get("purpose", ""),
            tech_stack=[TechItem(**t) for t in data.get("tech_stack", [])],
            key_features=data.get("key_features", []),
        )

    # ── Workflow ──────────────────────────────────────────────────────────────

    def generate_workflow(self, repo: str, files: dict[str, str]) -> WorkflowResult:
        system = """You are a senior software architect analyzing a codebase.
Return ONLY valid JSON — no markdown, no explanation:
{
  "architecture_pattern": "e.g. MVC, microservices, monolith, serverless",
  "entry_points": ["file or command that starts the app"],
  "data_flow": "step-by-step description of how a request flows through the system",
  "components": [
    {"name": "...", "description": "what it does", "key_files": ["path/to/file"]}
  ],
  "notable_patterns": ["design pattern or convention observed"]
}"""
        user = f"Repository: {repo}\n\nFiles:\n{_format_files(files)}"
        data = json.loads(_strip_fences(self._call(system, user)))
        return WorkflowResult(
            repo=repo,
            architecture_pattern=data.get("architecture_pattern", ""),
            entry_points=data.get("entry_points", []),
            data_flow=data.get("data_flow", ""),
            components=[Component(**c) for c in data.get("components", [])],
            notable_patterns=data.get("notable_patterns", []),
        )

    # ── Chat ─────────────────────────────────────────────────────────────────

    def chat(self, repo: str, files: dict[str, str], messages: list[dict]) -> ChatResponse:
        system = f"""You are an expert code assistant for the GitHub repository: {repo}

You have access to the following source files:

{_format_files(files)}

Rules:
- Be precise, reference specific files and line numbers when relevant
- Use markdown for code snippets
- List cited files in cited_files
- If you cannot answer from the provided files, say so honestly

Return ONLY valid JSON:
{{"answer": "your markdown answer", "cited_files": ["path/to/file"]}}"""

        groq_messages = [{"role": "system", "content": system}]
        for m in messages[-10:]:
            groq_messages.append({"role": m["role"], "content": m["content"]})

        response = self._client.chat.completions.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=groq_messages,
        )
        raw = _strip_fences(response.choices[0].message.content)
        try:
            data = json.loads(raw)
            return ChatResponse(answer=data.get("answer", raw), cited_files=data.get("cited_files", []))
        except json.JSONDecodeError:
            return ChatResponse(answer=raw, cited_files=[])

    # ── Document generation ──────────────────────────────────────────────────

    def generate_doc(self, repo: str, files: dict[str, str], doc_type: str, custom_prompt: str = "") -> DocResponse:
        prompts = {
            "onboarding":   "Write a comprehensive onboarding guide for a new engineer. Cover: what the project does, local setup steps, key concepts, important files to read first, and how to make a first contribution.",
            "architecture": "Write a technical architecture document. Cover: system overview, component breakdown, data models, API design, infrastructure, and key architectural decisions with their rationale.",
            "api":          "Generate a complete API reference from the codebase. For each endpoint: HTTP method, path, request body/params, response shape, auth requirements, and a usage example.",
            "security":     "Perform a security audit. Identify: auth/authorization flows, input validation gaps, secrets handling, dependency risks, and specific vulnerabilities with file references.",
            "custom":       custom_prompt or "Write a detailed technical document about this codebase.",
        }
        system = """You are a technical writer with deep software engineering expertise.
Produce a high-quality, well-formatted Markdown document.
Be specific: reference actual files, functions, and patterns from the code.
Do not pad with generic advice — everything must be grounded in what is actually in this repo."""
        user = f"Repository: {repo}\nTask: {prompts[doc_type]}\n\nSource files:\n{_format_files(files)}"
        content = self._call(system, user)
        return DocResponse(doc_type=doc_type, content=content)
