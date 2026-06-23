"""FX and commodity data via Alpha Vantage. Used by the macro agent (DXY proxy)."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from config import get_settings

logger = logging.getLogger("neuromax.forex")
ALPHA_BASE = "https://www.alphavantage.co/query"


class ForexFeed:
    def __init__(self) -> None:
        settings = get_settings()
        self._key = settings.alpha_vantage_api_key
        self._timeout = settings.request_timeout

    async def get_rate(self, from_ccy: str = "USD", to_ccy: str = "EUR") -> dict[str, Any]:
        if not self._key:
            return {"pair": f"{from_ccy}/{to_ccy}", "rate": 0.0, "asset_class": "forex"}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    ALPHA_BASE,
                    params={
                        "function": "CURRENCY_EXCHANGE_RATE",
                        "from_currency": from_ccy,
                        "to_currency": to_ccy,
                        "apikey": self._key,
                    },
                )
                resp.raise_for_status()
                d = resp.json().get("Realtime Currency Exchange Rate", {})
            return {
                "pair": f"{from_ccy}/{to_ccy}",
                "rate": float(d.get("5. Exchange Rate", 0) or 0),
                "asset_class": "forex",
            }
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            logger.warning("get_rate(%s/%s) failed: %s", from_ccy, to_ccy, exc)
            return {"pair": f"{from_ccy}/{to_ccy}", "rate": 0.0, "asset_class": "forex"}

    async def get_dxy_proxy(self) -> float:
        """A lightweight USD-strength proxy from a basket of major pairs.

        The real DXY is a weighted geometric mean; this is a directional proxy
        usable on the free tier without a dedicated index feed.
        """
        pairs = [("USD", "EUR"), ("USD", "JPY"), ("USD", "GBP")]
        rates = []
        for a, b in pairs:
            r = await self.get_rate(a, b)
            if r["rate"] > 0:
                rates.append(r["rate"])
        if not rates:
            return 0.0
        return round(sum(rates) / len(rates), 4)
