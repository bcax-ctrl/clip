"""Long-term memory with lightweight vector similarity, persisted to Redis.

To avoid a hard dependency on an external embedding provider, we embed text with
a deterministic hashed bag-of-words vector and rank with cosine similarity. This
is fast, self-contained, and good enough to recall the most relevant prior
analyses for an asset. Records are stored in Redis (JSON) and survive restarts;
if Redis is unavailable the store degrades to an in-process list.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

import numpy as np
import redis.asyncio as redis

from config import get_settings

logger = logging.getLogger("neuromax.memory")

_DIM = 256  # hashed embedding dimensionality
_KEY = "neuromax:memory"


def _embed(text: str) -> np.ndarray:
    """Hash tokens into a fixed-width frequency vector, then L2-normalise."""
    vec = np.zeros(_DIM, dtype=np.float32)
    for token in re.findall(r"[a-z0-9]+", text.lower()):
        vec[hash(token) % _DIM] += 1.0
    norm = np.linalg.norm(vec)
    return vec / norm if norm else vec


class VectorStore:
    def __init__(self) -> None:
        self._url = get_settings().redis_url
        self._redis: redis.Redis | None = None
        self._fallback: list[dict[str, Any]] = []

    async def _conn(self) -> redis.Redis | None:
        if self._redis is None:
            try:
                self._redis = redis.from_url(self._url, decode_responses=True)
                await self._redis.ping()
            except Exception as exc:  # pragma: no cover - infra dependent
                logger.warning("Redis unavailable, using in-memory store: %s", exc)
                self._redis = None
        return self._redis

    async def add(
        self,
        symbol: str,
        text: str,
        user_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        record = {
            "symbol": symbol.upper(),
            "user_id": user_id,
            "text": text,
            "metadata": metadata or {},
            "embedding": _embed(text).tolist(),
            "ts": time.time(),
        }
        conn = await self._conn()
        if conn is not None:
            await conn.rpush(_KEY, json.dumps(record))
            await conn.ltrim(_KEY, -1000, -1)  # cap memory size
        else:
            self._fallback.append(record)
            self._fallback = self._fallback[-1000:]

    async def search(self, query: str, top_k: int = 3) -> list[dict[str, Any]]:
        records = await self._all()
        if not records:
            return []
        q = _embed(query)
        scored = []
        for r in records:
            emb = np.array(r["embedding"], dtype=np.float32)
            score = float(np.dot(q, emb))
            # Bias toward same-symbol and recent records.
            if r["symbol"] == query.upper():
                score += 0.5
            scored.append((score, r))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {"text": r["text"], "metadata": r["metadata"], "ts": r["ts"], "score": round(s, 3)}
            for s, r in scored[:top_k]
            if s > 0
        ]

    async def _all(self) -> list[dict[str, Any]]:
        conn = await self._conn()
        if conn is not None:
            raw = await conn.lrange(_KEY, 0, -1)
            return [json.loads(r) for r in raw]
        return list(self._fallback)
