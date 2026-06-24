"""SentimentAgent — news + headline sentiment scored on a -100..+100 scale.

Uses NewsAPI when a key is present. Sentiment is computed with a compact
finance lexicon so the agent has zero heavy ML dependencies and stays fast.
"""
from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from config import get_settings
from data.crypto_feed import base_ticker

from .base import BaseAgent

logger = logging.getLogger("neuromax.sentiment")
NEWS_BASE = "https://newsapi.org/v2/everything"

_POSITIVE = {
    "surge", "rally", "bullish", "gain", "soar", "breakout", "adoption", "upgrade",
    "partnership", "record", "boom", "outperform", "approve", "approval", "buy",
    "support", "growth", "strong", "beat", "optimism", "inflow", "accumulate",
}
_NEGATIVE = {
    "crash", "plunge", "bearish", "loss", "dump", "selloff", "hack", "exploit",
    "ban", "lawsuit", "fraud", "downgrade", "fear", "weak", "miss", "outflow",
    "liquidation", "decline", "fall", "risk", "warning", "collapse", "default",
}

_NAMES = {
    "BTC": "Bitcoin", "ETH": "Ethereum", "SOL": "Solana", "BNB": "Binance",
    "XRP": "XRP Ripple", "ADA": "Cardano", "DOGE": "Dogecoin", "AVAX": "Avalanche",
}


def _score_text(text: str) -> int:
    tokens = re.findall(r"[a-z]+", text.lower())
    pos = sum(t in _POSITIVE for t in tokens)
    neg = sum(t in _NEGATIVE for t in tokens)
    total = pos + neg
    if total == 0:
        return 0
    return round(((pos - neg) / total) * 100)


class SentimentAgent(BaseAgent):
    name = "sentiment"
    label = "Sentiment Agent"

    def __init__(self) -> None:
        settings = get_settings()
        self._key = settings.news_api_key
        self._timeout = settings.request_timeout

    async def analyze(self, symbol: str) -> dict[str, Any]:
        ticker = base_ticker(symbol)
        query = _NAMES.get(ticker, ticker)
        headlines = await self._fetch_headlines(query)
        if not headlines:
            return {"available": False, "score": 0, "label": "neutral", "headlines": []}

        scores = [_score_text(f"{h['title']} {h.get('description') or ''}") for h in headlines]
        agg = round(sum(scores) / len(scores))
        label = "bullish" if agg > 15 else "bearish" if agg < -15 else "neutral"
        ranked = sorted(
            ({"title": h["title"], "source": h["source"], "score": s} for h, s in zip(headlines, scores)),
            key=lambda x: abs(x["score"]),
            reverse=True,
        )
        return {
            "available": True,
            "score": agg,  # -100..+100, drives the SentimentMeter
            "label": label,
            "article_count": len(headlines),
            "headlines": ranked[:8],
        }

    async def _fetch_headlines(self, query: str) -> list[dict[str, Any]]:
        if not self._key:
            return []
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    NEWS_BASE,
                    params={
                        "q": query,
                        "language": "en",
                        "sortBy": "publishedAt",
                        "pageSize": 20,
                        "apiKey": self._key,
                    },
                )
                resp.raise_for_status()
                articles = resp.json().get("articles", [])
            return [
                {
                    "title": a.get("title") or "",
                    "description": a.get("description"),
                    "source": (a.get("source") or {}).get("name", "unknown"),
                }
                for a in articles
                if a.get("title")
            ]
        except httpx.HTTPError as exc:
            logger.warning("news fetch failed for %s: %s", query, exc)
            return []
