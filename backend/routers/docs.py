from fastapi import APIRouter, HTTPException
from ..schemas import DocRequest, DocResponse, parse_github_url
from ..services.github import GitHubService
from ..services.claude import ClaudeService
from ..services.cache import files_cache
from ..config import get_settings

VALID_DOC_TYPES = {"onboarding", "architecture", "api", "security", "custom"}

router = APIRouter(prefix="/generate-doc", tags=["docs"])


@router.post("", response_model=DocResponse)
async def generate_doc(body: DocRequest):
    """
    Generate a full Markdown document for a repo.
    doc_type: onboarding | architecture | api | security | custom
    """
    if body.doc_type not in VALID_DOC_TYPES:
        raise HTTPException(status_code=422, detail=f"doc_type must be one of {VALID_DOC_TYPES}")
    if body.doc_type == "custom" and not body.custom_prompt.strip():
        raise HTTPException(status_code=422, detail="custom_prompt is required when doc_type is 'custom'")

    owner, repo = parse_github_url(body.repo_url)
    cache_key = f"{owner}/{repo}"
    s = get_settings()

    files = files_cache.get(cache_key)
    if files is None:
        gh = GitHubService(token=s.github_token)
        try:
            files = await gh.fetch_relevant_files(owner, repo)
            files_cache.set(cache_key, files)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch repo files: {e}")

    claude = ClaudeService(api_key=s.groq_api_key)
    try:
        return claude.generate_doc(cache_key, files, body.doc_type, body.custom_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Document generation failed: {e}")
