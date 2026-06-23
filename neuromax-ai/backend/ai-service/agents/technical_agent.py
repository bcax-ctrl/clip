"""TechnicalAgent — RSI, MACD, Bollinger Bands and EMA from live candles."""
from __future__ import annotations

from typing import Any

import numpy as np

from data import CryptoFeed

from .base import BaseAgent


def _ema(values: np.ndarray, period: int) -> np.ndarray:
    """Exponential moving average, returned for the full series."""
    alpha = 2 / (period + 1)
    out = np.empty_like(values)
    out[0] = values[0]
    for i in range(1, len(values)):
        out[i] = alpha * values[i] + (1 - alpha) * out[i - 1]
    return out


def _rsi(closes: np.ndarray, period: int = 14) -> float:
    if len(closes) <= period:
        return 50.0
    deltas = np.diff(closes)
    gains = np.clip(deltas, 0, None)
    losses = -np.clip(deltas, None, 0)
    avg_gain = gains[-period:].mean()
    avg_loss = losses[-period:].mean()
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return float(100 - (100 / (1 + rs)))


def _macd(closes: np.ndarray) -> dict[str, float]:
    if len(closes) < 35:
        return {"macd": 0.0, "signal": 0.0, "histogram": 0.0}
    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    macd_line = ema12 - ema26
    signal_line = _ema(macd_line, 9)
    return {
        "macd": round(float(macd_line[-1]), 6),
        "signal": round(float(signal_line[-1]), 6),
        "histogram": round(float(macd_line[-1] - signal_line[-1]), 6),
    }


def _bollinger(closes: np.ndarray, period: int = 20, mult: float = 2.0) -> dict[str, float]:
    if len(closes) < period:
        return {"upper": 0.0, "middle": 0.0, "lower": 0.0, "pct_b": 0.5}
    window = closes[-period:]
    middle = window.mean()
    std = window.std()
    upper = middle + mult * std
    lower = middle - mult * std
    last = closes[-1]
    pct_b = (last - lower) / (upper - lower) if upper != lower else 0.5
    return {
        "upper": round(float(upper), 6),
        "middle": round(float(middle), 6),
        "lower": round(float(lower), 6),
        "pct_b": round(float(pct_b), 4),
    }


class TechnicalAgent(BaseAgent):
    name = "technical"
    label = "Technical Agent"

    def __init__(self, crypto: CryptoFeed) -> None:
        self._crypto = crypto

    async def analyze(self, symbol: str) -> dict[str, Any]:
        candles = await self._crypto.get_klines(symbol, interval="1h", limit=200)
        if len(candles) < 35:
            return {"available": False, "reason": "insufficient candles"}

        closes = np.array([c["close"] for c in candles], dtype=float)
        rsi = round(_rsi(closes), 2)
        macd = _macd(closes)
        bb = _bollinger(closes)
        ema_fast = round(float(_ema(closes, 12)[-1]), 6)
        ema_slow = round(float(_ema(closes, 26)[-1]), 6)

        # Derive a simple bias for the orchestrator to weigh.
        bias = "neutral"
        if rsi > 70 or bb["pct_b"] > 1:
            bias = "overbought"
        elif rsi < 30 or bb["pct_b"] < 0:
            bias = "oversold"
        elif ema_fast > ema_slow and macd["histogram"] > 0:
            bias = "bullish"
        elif ema_fast < ema_slow and macd["histogram"] < 0:
            bias = "bearish"

        return {
            "available": True,
            "rsi": rsi,
            "macd": macd,
            "bollinger": bb,
            "ema_fast": ema_fast,
            "ema_slow": ema_slow,
            "last_price": round(float(closes[-1]), 6),
            "bias": bias,
        }
