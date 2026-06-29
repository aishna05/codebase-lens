from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .routers import analyze, summary, workflow, chat, docs, scan, explain

settings = get_settings()

app = FastAPI(
    title="Codebase Lens API",
    description="Analyze any GitHub repo — summary, workflow, Q&A, and doc generation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")
app.include_router(summary.router, prefix="/api")
app.include_router(workflow.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(docs.router, prefix="/api")
app.include_router(scan.router, prefix="/api")
app.include_router(explain.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
