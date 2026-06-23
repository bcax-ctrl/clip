"""Crypto market data: Binance (prices/klines) + CoinGecko (market metadata).

Both providers have usable free tiers. Every call is defensive: network errors
return empty/neutral data rather than raising, so a single flaky upstream never
takes down an analysis run.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from config import get_settings

logger = logging.getLogger("neuromax.crypto")

BINANCE_BASE = "https://api.binance.com"
COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# Map common tickers to the ids each provider expects.
_COINGECKO_IDS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "BNB": "binancecoin",
    "XRP": "ripple",
    "ADA": "cardano",
    "DOGE": "dogecoin",
    "AVAX": "avalanche-2",
    "MATIC": "matic-network",
    "DOT": "polkadot",
}


def to_binance_symbol(symbol: str) -> str:
    """Normalise e.g. ``btc`` / ``BTC-USDT`` -> ``BTCUSDT``."""
    s = symbol.upper().replace("-", "").replace("/", "")
    if not s.endswith(("USDT", "USDC", "BUSD")):
        s += "USDT"
    return s


def base_ticker(symbol: str) -> str:
    s = symbol.upper().replace("-", "").replace("/", "")
    for quote in ("USDT", "USDC", "BUSD", "USD"):
        if s.endswith(quote):
            return s[: -len(quote)]
    return s


class CryptoFeed:
    def __init__(self) -> None:
        settings = get_settings()
        self._cg_key = settings.coingecko_api_key
        self._timeout = settings.request_timeout

    def _cg_headers(self) -> dict[str, str]:
        return {"x-cg-demo-api-key": self._cg_key} if self._cg_key else {}

    async def get_price(self, symbol: str) -> dict[str, Any]:
        """24h ticker for a single symbol from Binance."""
        bsym = to_binance_symbol(symbol)
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    f"{BINANCE_BASE}/api/v3/ticker/24hr", params={"symbol": bsym}
                )
                resp.raise_for_status()
                d = resp.json()
            return {
                "symbol": bsym,
                "price": float(d["lastPrice"]),
                "change_24h": float(d["priceChangePercent"]),
                "volume_24h": float(d["quoteVolume"]),
                "high_24h": float(d["highPrice"]),
                "low_24h": float(d["lowPrice"]),
            }
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("get_price(%s) failed: %s", symbol, exc)
            return {"symbol": bsym, "price": 0.0, "change_24h": 0.0, "volume_24h": 0.0}

    async def get_klines(
        self, symbol: str, interval: str = "1h", limit: int = 200
    ) -> list[dict[str, Any]]:
        """OHLCV candles, oldest first."""
        bsym = to_binance_symbol(symbol)
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    f"{BINANCE_BASE}/api/v3/klines",
                    params={"symbol": bsym, "interval": interval, "limit": limit},
                )
                resp.raise_for_status()
                rows = resp.json()
            return [
                {
                    "time": int(r[0] // 1000),
                    "open": float(r[1]),
                    "high": float(r[2]),
                    "low": float(r[3]),
                    "close": float(r[4]),
                    "volume": float(r[5]),
                }
                for r in rows
            ]
        except (httpx.HTTPError, IndexError, ValueError) as exc:
            logger.warning("get_klines(%s) failed: %s", symbol, exc)
            return []

    async def get_market_data(self, symbol: str) -> dict[str, Any]:
        """Rich market metadata (mcap, supply, ATH) from CoinGecko."""
        cg_id = _COINGECKO_IDS.get(base_ticker(symbol))
        if not cg_id:
            return {}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    f"{COINGECKO_BASE}/coins/{cg_id}",
                    params={"localization": "false", "tickers": "false", "developer_data": "false"},
                    headers=self._cg_headers(),
                )
                resp.raise_for_status()
                d = resp.json()
            md = d.get("market_data", {})
            return {
                "name": d.get("name"),
                "market_cap": md.get("market_cap", {}).get("usd"),
                "circulating_supply": md.get("circulating_supply"),
                "ath": md.get("ath", {}).get("usd"),
                "ath_change_pct": md.get("ath_change_percentage", {}).get("usd"),
            }
        except (httpx.HTTPError, KeyError) as exc:
            logger.warning("get_market_data(%s) failed: %s", symbol, exc)
            return {}

    async def get_top_markets(self, limit: int = 20) -> list[dict[str, Any]]:
        """Top coins by market cap — powers the market explorer/heatmap."""
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    f"{COINGECKO_BASE}/coins/markets",
                    params={
                        "vs_currency": "usd",
                        "order": "market_cap_desc",
                        "per_page": limit,
                        "page": 1,
                        "price_change_percentage": "24h",
                    },
                    headers=self._cg_headers(),
                )
                resp.raise_for_status()
                rows = resp.json()
            return [
                {
                    "symbol": r["symbol"].upper(),
                    "name": r["name"],
                    "price": r["current_price"],
                    "change_24h": r.get("price_change_percentage_24h") or 0.0,
                    "market_cap": r.get("market_cap"),
                    "image": r.get("image"),
                    "asset_class": "crypto",
                }
                for r in rows
            ]
        except (httpx.HTTPError, KeyError) as exc:
            logger.warning("get_top_markets failed: %s", exc)
            return []
