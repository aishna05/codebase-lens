from pathlib import Path
from fastapi import APIRouter, HTTPException
from ..schemas import ExplainRequest, ExplainResponse
from ..services.claude import ClaudeService
from ..config import get_settings

router = APIRouter(prefix="/explain", tags=["explain"])

MAX_CONTENT = 8000   # chars sent to the model


@router.post("", response_model=ExplainResponse)
def explain_file(body: ExplainRequest):
    s = get_settings()

    # If content is empty, try reading from disk using the path
    content = body.content
    if not content.strip():
        try:
            content = Path(body.path).read_text(encoding="utf-8", errors="ignore")
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Could not read file: {e}")

    claude = ClaudeService(api_key=s.groq_api_key)
    try:
        return claude.explain_file(body.path, content[:MAX_CONTENT])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Explanation failed: {e}")
