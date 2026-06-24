"""Read-only Binance portfolio sync.

Uses an HMAC-signed call to /api/v3/account (read-only key recommended) to fetch
balances, then prices them with live tickers to compute holdings and P&L.
Without keys it returns an empty portfolio so the app still runs.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import time
import urllib.parse
from typing import Any

import httpx

from config import get_settings
from data.crypto_feed import BINANCE_BASE, CryptoFeed

logger = logging.getLogger("neuromax.binance")

# Balances in these assets are treated as USD-pegged (value 1:1).
_STABLES = {"USDT", "USDC", "BUSD", "FDUSD", "DAI", "TUSD"}
_DUST_USD = 1.0  # ignore positions worth less than this


class BinanceSync:
    def __init__(self) -> None:
        s = get_settings()
        self._key = s.binance_api_key
        self._secret = s.binance_secret
        self._timeout = s.request_timeout
        self._crypto = CryptoFeed()

    def _sign(self, params: dict[str, Any]) -> str:
        query = urllib.parse.urlencode(params)
        return hmac.new(self._secret.encode(), query.encode(), hashlib.sha256).hexdigest()

    async def get_portfolio(self) -> dict[str, Any]:
        if not self._key or not self._secret:
            return {
                "connected": False,
                "total_value_usd": 0.0,
                "holdings": [],
                "note": "Set BINANCE_API_KEY/BINANCE_SECRET (read-only) to sync.",
            }

        balances = await self._fetch_balances()
        if not balances:
            return {"connected": True, "total_value_usd": 0.0, "holdings": [], "note": "No balances."}

        holdings: list[dict[str, Any]] = []
        total = 0.0
        for asset, amount in balances.items():
            if asset in _STABLES:
                value = amount
                price = 1.0
                change = 0.0
            else:
                tick = await self._crypto.get_price(asset)
                price = tick.get("price", 0.0)
                change = tick.get("change_24h", 0.0)
                value = price * amount
            if value < _DUST_USD:
                continue
            total += value
            holdings.append(
                {"symbol": asset, "amount": round(amount, 8), "price": price,
                 "value_usd": round(value, 2), "change_24h": change}
            )

        # Weights + simple diversification (Herfindahl-based) metric.
        for h in holdings:
            h["weight_pct"] = round(h["value_usd"] / total * 100, 2) if total else 0.0
        hhi = sum((h["weight_pct"] / 100) ** 2 for h in holdings)
        diversification = round((1 - hhi) * 100, 1)  # 0 = concentrated, ~100 = spread

        holdings.sort(key=lambda h: h["value_usd"], reverse=True)
        return {
            "connected": True,
            "total_value_usd": round(total, 2),
            "holdings": holdings,
            "diversification_score": diversification,
            "position_count": len(holdings),
        }

    async def _fetch_balances(self) -> dict[str, float]:
        params = {"timestamp": int(time.time() * 1000), "recvWindow": 5000}
        params["signature"] = self._sign(params)
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    f"{BINANCE_BASE}/api/v3/account",
                    params=params,
                    headers={"X-MBX-APIKEY": self._key},
                )
                resp.raise_for_status()
                data = resp.json()
            out: dict[str, float] = {}
            for b in data.get("balances", []):
                amt = float(b["free"]) + float(b["locked"])
                if amt > 0:
                    out[b["asset"]] = amt
            return out
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("binance account fetch failed: %s", exc)
            return {}
