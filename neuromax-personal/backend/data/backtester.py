"""Vectorised backtesting engine with a few built-in strategies.

Pure-Python/numpy, no I/O. Computes win rate, Sharpe, max drawdown, total
return and an equity curve for replay in the browser.
"""
from __future__ import annotations

from typing import Any

import numpy as np


# ─── Indicators ────────────────────────────────────────────────────────────────
def _sma(values: np.ndarray, period: int) -> np.ndarray:
    out = np.full_like(values, np.nan, dtype=float)
    if len(values) >= period:
        cumsum = np.cumsum(np.insert(values, 0, 0))
        out[period - 1:] = (cumsum[period:] - cumsum[:-period]) / period
    return out


def _ema(values: np.ndarray, period: int) -> np.ndarray:
    alpha = 2 / (period + 1)
    out = np.empty_like(values, dtype=float)
    out[0] = values[0]
    for i in range(1, len(values)):
        out[i] = alpha * values[i] + (1 - alpha) * out[i - 1]
    return out


def _rsi(values: np.ndarray, period: int = 14) -> np.ndarray:
    out = np.full_like(values, 50.0, dtype=float)
    deltas = np.diff(values)
    for i in range(period, len(values)):
        window = deltas[i - period:i]
        gain = window[window > 0].sum() / period
        loss = -window[window < 0].sum() / period
        out[i] = 100.0 if loss == 0 else 100 - 100 / (1 + gain / loss)
    return out


# ─── Signal generators (return +1 long / 0 flat per bar) ────────────────────────
def _signals(strategy: str, closes: np.ndarray, params: dict) -> np.ndarray:
    n = len(closes)
    sig = np.zeros(n)
    if strategy == "rsi":
        lo = params.get("oversold", 30)
        hi = params.get("overbought", 70)
        rsi = _rsi(closes, params.get("period", 14))
        holding = False
        for i in range(n):
            if not holding and rsi[i] < lo:
                holding = True
            elif holding and rsi[i] > hi:
                holding = False
            sig[i] = 1.0 if holding else 0.0
    elif strategy == "sma_cross":
        fast = _sma(closes, params.get("fast", 20))
        slow = _sma(closes, params.get("slow", 50))
        sig = np.where(fast > slow, 1.0, 0.0)
    elif strategy == "macd":
        macd = _ema(closes, params.get("fast", 12)) - _ema(closes, params.get("slow", 26))
        signal = _ema(macd, params.get("signal", 9))
        sig = np.where(macd > signal, 1.0, 0.0)
    else:
        raise ValueError(f"unknown strategy '{strategy}'")
    return np.nan_to_num(sig)


def run_backtest(
    candles: list[dict[str, Any]],
    strategy: str = "sma_cross",
    params: dict | None = None,
    fee_bps: float = 10.0,
    initial_capital: float = 10_000.0,
) -> dict[str, Any]:
    """Backtest a long/flat strategy on daily candles."""
    params = params or {}
    if len(candles) < 30:
        return {"error": "need at least 30 candles"}

    closes = np.array([c["close"] for c in candles], dtype=float)
    times = [c["time"] for c in candles]
    sig = _signals(strategy, closes, params)

    # Position is yesterday's signal (act on next bar's open ≈ close), so no lookahead.
    pos = np.zeros_like(sig)
    pos[1:] = sig[:-1]

    returns = np.zeros_like(closes)
    returns[1:] = closes[1:] / closes[:-1] - 1
    strat_returns = pos * returns

    # Apply fees whenever the position changes.
    fee = fee_bps / 10_000.0
    turnover = np.abs(np.diff(np.insert(pos, 0, 0)))
    strat_returns = strat_returns - turnover * fee

    equity = initial_capital * np.cumprod(1 + strat_returns)
    equity_curve = [{"time": t, "equity": round(float(e), 2)} for t, e in zip(times, equity)]

    # Trade stats: a trade is an entry→exit round trip.
    trades = _extract_trades(pos, closes, fee)
    wins = [t for t in trades if t > 0]
    win_rate = round(len(wins) / len(trades) * 100, 2) if trades else 0.0

    total_return = round((equity[-1] / initial_capital - 1) * 100, 2)
    sharpe = _sharpe(strat_returns)
    max_dd = _max_drawdown(equity)

    # Buy & hold benchmark.
    bh_return = round((closes[-1] / closes[0] - 1) * 100, 2)

    return {
        "strategy": strategy,
        "params": params,
        "initial_capital": initial_capital,
        "final_equity": round(float(equity[-1]), 2),
        "total_return_pct": total_return,
        "buy_hold_return_pct": bh_return,
        "trades": len(trades),
        "win_rate_pct": win_rate,
        "sharpe_ratio": sharpe,
        "max_drawdown_pct": max_dd,
        "equity_curve": equity_curve,
    }


def _extract_trades(pos: np.ndarray, closes: np.ndarray, fee: float) -> list[float]:
    trades: list[float] = []
    entry = None
    for i in range(len(pos)):
        if pos[i] == 1 and entry is None:
            entry = closes[i]
        elif pos[i] == 0 and entry is not None:
            ret = (closes[i] / entry - 1) - 2 * fee
            trades.append(ret)
            entry = None
    if entry is not None:  # close at last bar
        trades.append((closes[-1] / entry - 1) - 2 * fee)
    return trades


def _sharpe(returns: np.ndarray, periods_per_year: int = 365) -> float:
    std = returns.std()
    if std == 0:
        return 0.0
    return round(float(returns.mean() / std * np.sqrt(periods_per_year)), 2)


def _max_drawdown(equity: np.ndarray) -> float:
    peak = np.maximum.accumulate(equity)
    dd = (equity - peak) / peak
    return round(float(dd.min()) * 100, 2)
