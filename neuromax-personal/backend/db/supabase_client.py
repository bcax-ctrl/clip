"""Storage abstraction over Supabase with an in-memory fallback.

If SUPABASE_URL/KEY are set and supabase-py is installed, calls go to Supabase.
Otherwise an in-process store keeps the app fully functional for local/personal
use (data is non-persistent across restarts in that mode).
"""
from __future__ import annotations

import itertools
import logging
import threading
import time
from typing import Any

from config import get_settings

logger = logging.getLogger("neuromax.store")

TABLES = ("users", "portfolios", "signals", "trades", "alerts", "backtest_results")


class Store:
    def __init__(self) -> None:
        s = get_settings()
        self._client = None
        self._mem: dict[str, list[dict[str, Any]]] = {t: [] for t in TABLES}
        self._ids = itertools.count(1)
        self._lock = threading.Lock()
        if s.supabase_url and s.supabase_key:
            try:
                from supabase import create_client  # lazy import

                self._client = create_client(s.supabase_url, s.supabase_key)
                logger.info("Supabase connected")
            except Exception as exc:  # pragma: no cover
                logger.warning("Supabase unavailable, using in-memory store: %s", exc)

    @property
    def backend(self) -> str:
        return "supabase" if self._client else "memory"

    def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        if self._client:
            res = self._client.table(table).insert(row).execute()
            return (res.data or [row])[0]
        with self._lock:
            record = {"id": next(self._ids), "created_at": time.time(), **row}
            self._mem[table].append(record)
            return record

    def select(self, table: str, filters: dict[str, Any] | None = None, limit: int = 100) -> list[dict[str, Any]]:
        if self._client:
            q = self._client.table(table).select("*")
            for k, v in (filters or {}).items():
                q = q.eq(k, v)
            res = q.limit(limit).order("created_at", desc=True).execute()
            return res.data or []
        with self._lock:
            rows = self._mem.get(table, [])
            if filters:
                rows = [r for r in rows if all(r.get(k) == v for k, v in filters.items())]
            return sorted(rows, key=lambda r: r.get("created_at", 0), reverse=True)[:limit]

    def update(self, table: str, row_id: Any, patch: dict[str, Any]) -> dict[str, Any] | None:
        if self._client:
            res = self._client.table(table).update(patch).eq("id", row_id).execute()
            return (res.data or [None])[0]
        with self._lock:
            for r in self._mem.get(table, []):
                if r.get("id") == row_id:
                    r.update(patch)
                    return r
        return None


_store: Store | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = Store()
    return _store
