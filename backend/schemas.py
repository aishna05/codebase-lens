from pydantic import BaseModel, field_validator
import re


def parse_github_url(url: str) -> tuple[str, str]:
    """Returns (owner, repo) from a GitHub URL or 'owner/repo' string."""
    url = url.strip().rstrip("/")
    # Accept shorthand: owner/repo
    if re.match(r"^[\w.-]+/[\w.-]+$", url):
        owner, repo = url.split("/", 1)
        return owner, repo.removesuffix(".git")
    # Full URL
    match = re.search(r"github\.com[/:]+([\w.-]+)/([\w.-]+?)(?:\.git)?$", url)
    if not match:
        raise ValueError("Not a valid GitHub repository URL")
    return match.group(1), match.group(2)


# ── Requests ─────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    repo_url: str

    @field_validator("repo_url")
    @classmethod
    def validate_url(cls, v):
        parse_github_url(v)   # raises if invalid
        return v.strip()


class ChatRequest(BaseModel):
    repo_url: str
    messages: list[dict]   # [{role: "user"|"assistant", content: str}]

    @field_validator("repo_url")
    @classmethod
    def validate_url(cls, v):
        parse_github_url(v)
        return v.strip()


class DocRequest(BaseModel):
    repo_url: str
    doc_type: str   # onboarding | architecture | api | security | custom
    custom_prompt: str = ""

    @field_validator("repo_url")
    @classmethod
    def validate_url(cls, v):
        parse_github_url(v)
        return v.strip()


# ── Responses ─────────────────────────────────────────────────────────────────

class TechItem(BaseModel):
    name: str
    role: str   # e.g. "Web framework", "Database ORM"


class Component(BaseModel):
    name: str
    description: str
    key_files: list[str]


class SummaryResult(BaseModel):
    repo: str
    language: str
    description: str
    purpose: str
    tech_stack: list[TechItem]
    key_features: list[str]


class WorkflowResult(BaseModel):
    repo: str
    architecture_pattern: str   # MVC, microservices, monolith, etc.
    entry_points: list[str]
    data_flow: str              # step-by-step prose
    components: list[Component]
    notable_patterns: list[str]


class AnalysisResult(BaseModel):
    repo: str
    owner: str
    stars: int | None = None
    forks: int | None = None
    language: str | None = None
    file_count: int
    files_analyzed: int
    summary: SummaryResult
    workflow: WorkflowResult


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatResponse(BaseModel):
    answer: str
    cited_files: list[str] = []


class DocResponse(BaseModel):
    doc_type: str
    content: str   # markdown
