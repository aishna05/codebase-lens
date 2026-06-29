from fastapi import APIRouter, HTTPException
from ..schemas import ChatRequest, ChatResponse, parse_github_url
from ..services.github import GitHubService
from ..services.claude import ClaudeService
from ..services.cache import files_cache
from ..config import get_settings

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest):
    """
    Q&A against a repo. The repo must have been analyzed first (files are
    cached from the /analyze call). If cache is cold, re-fetches automatically.
    """
    owner, repo = parse_github_url(body.repo_url)
    cache_key = f"{owner}/{repo}"
    s = get_settings()

    files = files_cache.get(cache_key)
    if files is None:
        # Re-fetch files if cache expired
        gh = GitHubService(token=s.github_token)
        try:
            files = await gh.fetch_relevant_files(owner, repo)
            files_cache.set(cache_key, files)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch repo files: {e}")

    if not files:
        raise HTTPException(status_code=422, detail="No files available for this repository")

    if not body.messages:
        raise HTTPException(status_code=422, detail="messages array cannot be empty")

    claude = ClaudeService(api_key=s.groq_api_key)
    try:
        return claude.chat(cache_key, files, body.messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat failed: {e}")
