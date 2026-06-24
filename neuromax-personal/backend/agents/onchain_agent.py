"""OnChainAgent — protocol/chain health from DefiLlama (free, no key required).

Pulls total value locked (TVL) and recent TVL momentum for the chain backing a
given asset, as a proxy for on-chain activity and protocol health.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from config import get_settings
from data.crypto_feed import base_ticker

from .base import BaseAgent

logger = logging.getLogger("neuromax.onchain")
LLAMA_BASE = "https://api.llama.fi"

# Map a base ticker to the DefiLlama chain slug.
_CHAINS = {
    "ETH": "Ethereum",
    "BTC": "Bitcoin",
    "SOL": "Solana",
    "BNB": "BSC",
    "AVAX": "Avalanche",
    "MATIC": "Polygon",
    "ADA": "Cardano",
    "DOT": "Polkadot",
}


class OnChainAgent(BaseAgent):
    name = "onchain"
    label = "On-Chain Agent"

    def __init__(self) -> None:
        self._timeout = get_settings().request_timeout

    async def analyze(self, symbol: str) -> dict[str, Any]:
        chain = _CHAINS.get(base_ticker(symbol))
        if not chain:
            return {"available": False, "reason": "no on-chain mapping for asset"}

        series = await self._chain_tvl(chain)
        if len(series) < 8:
            return {"available": False, "reason": "insufficient TVL history"}

        current = series[-1]
        week_ago = series[-8]
        change_7d = round(((current - week_ago) / week_ago) * 100, 2) if week_ago else 0.0
        health = "expanding" if change_7d > 2 else "contracting" if change_7d < -2 else "stable"
        return {
            "available": True,
            "chain": chain,
            "tvl_usd": round(current),
            "tvl_change_7d_pct": change_7d,
            "health": health,
        }

    async def _chain_tvl(self, chain: str) -> list[float]:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(f"{LLAMA_BASE}/v2/historicalChainTvl/{chain}")
                resp.raise_for_status()
                rows = resp.json()
            return [float(r["tvl"]) for r in rows][-30:]
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("TVL fetch failed for %s: %s", chain, exc)
            return []
