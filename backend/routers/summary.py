from fastapi import APIRouter, HTTPException
from ..schemas import AnalyzeRequest, SummaryResult, parse_github_url
from ..services.github import GitHubService
from ..services.claude import ClaudeService
from ..services.cache import analysis_cache, files_cache
from ..config import get_settings

router = APIRouter(prefix="/summary", tags=["summary"])


@router.post("", response_model=SummaryResult)
async def get_summary(body: AnalyzeRequest):
    """
    Lightweight endpoint: returns only the summary portion.
    Uses cached analysis if available; otherwise fetches + generates just the summary.
    """
    owner, repo = parse_github_url(body.repo_url)
    cache_key = f"{owner}/{repo}"
    s = get_settings()

    # Return from full analysis cache if available
    cached_analysis = analysis_cache.get(cache_key)
    if cached_analysis:
        return cached_analysis.summary

    gh = GitHubService(token=s.github_token)
    try:
        files = await gh.fetch_relevant_files(owner, repo)
        files_cache.set(cache_key, files)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch repo: {e}")

    if not files:
        raise HTTPException(status_code=422, detail="Repository is empty or no readable files found")

    claude = ClaudeService(api_key=s.groq_api_key)
    try:
        return claude.generate_summary(cache_key, files)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Summary generation failed: {e}")
