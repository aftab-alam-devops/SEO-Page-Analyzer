import json
from typing import Any

import redis

from app.config import settings

_redis: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


SCAN_KEY_PREFIX = "scan:"
SCAN_TTL_SECONDS = 3600


def scan_key(job_id: str) -> str:
    return f"{SCAN_KEY_PREFIX}{job_id}"


def set_scan_progress(job_id: str, data: dict[str, Any]) -> None:
    r = get_redis()
    r.setex(scan_key(job_id), SCAN_TTL_SECONDS, json.dumps(data))


def get_scan_progress(job_id: str) -> dict[str, Any] | None:
    r = get_redis()
    raw = r.get(scan_key(job_id))
    if not raw:
        return None
    return json.loads(raw)
