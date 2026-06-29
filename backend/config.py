from pathlib import Path
from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    groq_api_key: str = ""
    github_token: str = ""
    debug: bool = True
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = str(_ENV_FILE)


def get_settings() -> Settings:
    return Settings()
