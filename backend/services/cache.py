import time
from dataclasses import dataclass, field
from typing import Any

TTL_SECONDS = 3600   # 1 hour


@dataclass
class CacheEntry:
    value: Any
    expires_at: float = field(default_factory=lambda: time.time() + TTL_SECONDS)

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class RepoCache:
    """Simple in-memory cache keyed by 'owner/repo'."""

    def __init__(self):
        self._store: dict[str, CacheEntry] = {}

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None or entry.is_expired():
            self._store.pop(key, None)
            return None
        return entry.value

    def set(self, key: str, value: Any):
        self._store[key] = CacheEntry(value=value)

    def has(self, key: str) -> bool:
        return self.get(key) is not None

    def invalidate(self, key: str):
        self._store.pop(key, None)


# Module-level singletons shared across requests
analysis_cache = RepoCache()   # stores AnalysisResult
files_cache = RepoCache()      # stores raw files dict (for chat context)
