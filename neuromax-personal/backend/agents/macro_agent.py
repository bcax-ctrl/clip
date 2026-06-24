"""MacroAgent — USD strength (DXY proxy) and risk-on/risk-off read.

A strong dollar is generally a headwind for risk assets like crypto; the agent
turns the DXY proxy into a directional macro signal the orchestrator can weigh.
"""
from __future__ import annotations

from typing import Any

from data import ForexFeed

from .base import BaseAgent


class MacroAgent(BaseAgent):
    name = "macro"
    label = "Macro Agent"

    def __init__(self, forex: ForexFeed) -> None:
        self._forex = forex

    async def analyze(self, symbol: str) -> dict[str, Any]:
        dxy_proxy = await self._forex.get_dxy_proxy()
        if dxy_proxy <= 0:
            return {
                "available": False,
                "dxy_proxy": 0.0,
                "regime": "unknown",
                "note": "FX data unavailable (set ALPHA_VANTAGE_API_KEY).",
            }

        # The proxy averages USD/EUR, USD/JPY, USD/GBP. JPY dominates the scale,
        # so we interpret the trend qualitatively rather than against a fixed level.
        regime = "risk-on" if dxy_proxy < 60 else "risk-off"
        return {
            "available": True,
            "dxy_proxy": dxy_proxy,
            "regime": regime,
            "note": (
                "Elevated USD strength is a headwind for risk assets; "
                "softening USD is supportive."
            ),
        }
