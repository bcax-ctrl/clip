"""WhaleAgent — detects large trades from Binance aggregated-trade flow.

A true on-chain whale tracker needs node/indexer access; on the free tier we
approximate it by scanning recent aggregated trades for outsized notional value
and summarising net buy/sell pressure from the large players.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from config import get_settings
from data.crypto_feed import BINANCE_BASE, to_binance_symbol

from .base import BaseAgent

logger = logging.getLogger("neuromax.whale")

# Notional (USD) above which a single aggregated trade is considered a "whale".
WHALE_USD_THRESHOLD = 250_000.0


class WhaleAgent(BaseAgent):
    name = "whale"
    label = "Whale Agent"

    def __init__(self) -> None:
        self._timeout = get_settings().request_timeout

    async def analyze(self, symbol: str) -> dict[str, Any]:
        trades = await self._recent_trades(symbol)
        if not trades:
            return {"available": False, "whale_trades": [], "net_pressure": 0.0}

        whales: list[dict[str, Any]] = []
        buy_vol = sell_vol = 0.0
        for t in trades:
            notional = t["price"] * t["qty"]
            if notional < WHALE_USD_THRESHOLD:
                continue
            side = "sell" if t["buyer_maker"] else "buy"
            if side == "buy":
                buy_vol += notional
            else:
                sell_vol += notional
            whales.append(
                {
                    "side": side,
                    "notional_usd": round(notional),
                    "price": t["price"],
                    "qty": round(t["qty"], 4),
                    "time": t["time"],
                }
            )

        total = buy_vol + sell_vol
        net_pressure = round((buy_vol - sell_vol) / total, 3) if total else 0.0
        whales.sort(key=lambda w: w["notional_usd"], reverse=True)
        return {
            "available": True,
            "whale_count": len(whales),
            "buy_volume_usd": round(buy_vol),
            "sell_volume_usd": round(sell_vol),
            "net_pressure": net_pressure,  # -1 (heavy selling) .. +1 (heavy buying)
            "whale_trades": whales[:15],
        }

    async def _recent_trades(self, symbol: str) -> list[dict[str, Any]]:
        bsym = to_binance_symbol(symbol)
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    f"{BINANCE_BASE}/api/v3/aggTrades",
                    params={"symbol": bsym, "limit": 1000},
                )
                resp.raise_for_status()
                rows = resp.json()
            return [
                {
                    "price": float(r["p"]),
                    "qty": float(r["q"]),
                    "time": int(r["T"] // 1000),
                    "buyer_maker": bool(r["m"]),
                }
                for r in rows
            ]
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("whale trades fetch failed for %s: %s", symbol, exc)
            return []
