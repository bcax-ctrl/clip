"""Historical OHLCV loading from Binance (no key needed) with CoinGecko fallback."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from config import get_settings
from data.crypto_feed import BINANCE_BASE, COINGECKO_BASE, base_ticker, to_binance_symbol

logger = logging.getLogger("neuromax.historical")

# DefiLlama-style coin ids reused for the CoinGecko fallback.
_COINGECKO_IDS = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "BNB": "binancecoin",
    "XRP": "ripple", "ADA": "cardano", "DOGE": "dogecoin", "AVAX": "avalanche-2",
    "MATIC": "matic-network", "DOT": "polkadot",
}


async def load_ohlcv(symbol: str, interval: str = "1d", limit: int = 365) -> list[dict[str, Any]]:
    """Return OHLCV candles (oldest first). Tries Binance, then CoinGecko."""
    candles = await _binance_ohlcv(symbol, interval, limit)
    if candles:
        return candles
    return await _coingecko_ohlcv(symbol, limit)


async def _binance_ohlcv(symbol: str, interval: str, limit: int) -> list[dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=get_settings().request_timeout) as client:
            resp = await client.get(
                f"{BINANCE_BASE}/api/v3/klines",
                params={"symbol": to_binance_symbol(symbol), "interval": interval, "limit": limit},
            )
            resp.raise_for_status()
            rows = resp.json()
        return [
            {
                "time": int(r[0] // 1000),
                "open": float(r[1]), "high": float(r[2]),
                "low": float(r[3]), "close": float(r[4]), "volume": float(r[5]),
            }
            for r in rows
        ]
    except (httpx.HTTPError, IndexError, ValueError) as exc:
        logger.warning("binance ohlcv failed for %s: %s", symbol, exc)
        return []


async def _coingecko_ohlcv(symbol: str, limit: int) -> list[dict[str, Any]]:
    cg_id = _COINGECKO_IDS.get(base_ticker(symbol))
    if not cg_id:
        return []
    days = min(max(limit, 1), 365)
    try:
        s = get_settings()
        headers = {"x-cg-demo-api-key": s.coingecko_api_key} if s.coingecko_api_key else {}
        async with httpx.AsyncClient(timeout=s.request_timeout) as client:
            resp = await client.get(
                f"{COINGECKO_BASE}/coins/{cg_id}/ohlc",
                params={"vs_currency": "usd", "days": days},
                headers=headers,
            )
            resp.raise_for_status()
            rows = resp.json()
        # CoinGecko OHLC rows have no volume; fill 0.
        return [
            {
                "time": int(r[0] // 1000),
                "open": float(r[1]), "high": float(r[2]),
                "low": float(r[3]), "close": float(r[4]), "volume": 0.0,
            }
            for r in rows
        ]
    except (httpx.HTTPError, IndexError, ValueError) as exc:
        logger.warning("coingecko ohlcv failed for %s: %s", symbol, exc)
        return []
