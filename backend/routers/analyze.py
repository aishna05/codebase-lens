from fastapi import APIRouter, HTTPException
from ..schemas import AnalyzeRequest, AnalysisResult, parse_github_url
from ..services.github import GitHubService
from ..services.claude import ClaudeService
from ..services.cache import analysis_cache, files_cache
from ..config import get_settings

router = APIRouter(prefix="/analyze", tags=["analyze"])


def _get_services():
    s = get_settings()
    return GitHubService(token=s.github_token), ClaudeService(api_key=s.groq_api_key)


@router.post("", response_model=AnalysisResult)
async def analyze_repo(body: AnalyzeRequest):
    """
    Full repo analysis: fetches files from GitHub, runs summary + workflow
    through Claude, returns structured result.

    Results are cached for 1 hour — same repo URL won't hit GitHub/Claude again.
    """
    owner, repo = parse_github_url(body.repo_url)
    cache_key = f"{owner}/{repo}"

    cached = analysis_cache.get(cache_key)
    if cached:
        return cached

    gh, claude = _get_services()

    # 1. Repo metadata (stars, forks, default language)
    try:
        meta = await gh.get_repo_meta(owner, repo)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {e}")

    # 2. Fetch relevant source files
    try:
        all_paths = await gh.get_file_tree(owner, repo)
        files = await gh.fetch_relevant_files(owner, repo)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch repo files: {e}")

    if not files:
        raise HTTPException(status_code=422, detail="Repository appears to be empty or all files were skipped")

    # Store raw files in cache so chat/doc endpoints can use them without re-fetching
    files_cache.set(cache_key, files)

    # 3. Claude: summary + workflow (run sequentially to avoid hammering the API)
    try:
        summary = claude.generate_summary(cache_key, files)
        workflow = claude.generate_workflow(cache_key, files)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analysis failed: {e}")

    result = AnalysisResult(
        repo=repo,
        owner=owner,
        stars=meta.get("stargazers_count"),
        forks=meta.get("forks_count"),
        language=meta.get("language"),
        file_count=len(all_paths),
        files_analyzed=len(files),
        summary=summary,
        workflow=workflow,
    )

    analysis_cache.set(cache_key, result)
    return result


@router.get("/{owner}/{repo}", response_model=AnalysisResult)
async def get_cached_analysis(owner: str, repo: str):
    """Returns a previously cached analysis, or 404 if not yet analyzed."""
    cache_key = f"{owner}/{repo}"
    cached = analysis_cache.get(cache_key)
    if not cached:
        raise HTTPException(status_code=404, detail="No cached analysis found. POST /api/analyze first.")
    return cached
