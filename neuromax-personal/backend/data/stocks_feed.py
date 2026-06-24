"""Equities data via Alpha Vantage. Falls back to neutral data without a key."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from config import get_settings

logger = logging.getLogger("neuromax.stocks")
ALPHA_BASE = "https://www.alphavantage.co/query"


class StocksFeed:
    def __init__(self) -> None:
        settings = get_settings()
        self._key = settings.alpha_vantage_api_key
        self._timeout = settings.request_timeout

    async def get_quote(self, symbol: str) -> dict[str, Any]:
        if not self._key:
            return {"symbol": symbol.upper(), "price": 0.0, "change_24h": 0.0, "asset_class": "stock"}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    ALPHA_BASE,
                    params={"function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": self._key},
                )
                resp.raise_for_status()
                q = resp.json().get("Global Quote", {})
            return {
                "symbol": symbol.upper(),
                "price": float(q.get("05. price", 0) or 0),
                "change_24h": float((q.get("10. change percent", "0%") or "0%").rstrip("%")),
                "volume_24h": float(q.get("06. volume", 0) or 0),
                "asset_class": "stock",
            }
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            logger.warning("stock get_quote(%s) failed: %s", symbol, exc)
            return {"symbol": symbol.upper(), "price": 0.0, "change_24h": 0.0, "asset_class": "stock"}

    async def get_daily_closes(self, symbol: str, limit: int = 100) -> list[float]:
        """Recent daily closes (newest last) for technical indicators."""
        if not self._key:
            return []
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    ALPHA_BASE,
                    params={
                        "function": "TIME_SERIES_DAILY",
                        "symbol": symbol,
                        "outputsize": "compact",
                        "apikey": self._key,
                    },
                )
                resp.raise_for_status()
                series = resp.json().get("Time Series (Daily)", {})
            closes = [float(v["4. close"]) for _, v in sorted(series.items())]
            return closes[-limit:]
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            logger.warning("stock get_daily_closes(%s) failed: %s", symbol, exc)
            return []
