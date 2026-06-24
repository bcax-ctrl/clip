"""Risk management: position sizing, R:R, portfolio heat, volatility sizing.

Pure functions — no I/O — so they're deterministic and easy to test.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class PositionSizing:
    position_size_usd: float
    quantity: float
    risk_usd: float
    risk_reward_ratio: float
    stop_loss: float
    take_profit: float


def position_size(
    account_balance: float,
    risk_pct: float,
    entry_price: float,
    stop_loss: float,
    take_profit: float | None = None,
) -> PositionSizing:
    """Risk-based position sizing.

    Risk a fixed % of the account on the distance to the stop. Quantity is
    chosen so that being stopped out loses exactly ``risk_usd``.
    """
    if entry_price <= 0 or account_balance <= 0:
        raise ValueError("entry_price and account_balance must be positive")
    if stop_loss <= 0 or stop_loss == entry_price:
        raise ValueError("stop_loss must be positive and differ from entry")

    risk_usd = account_balance * (risk_pct / 100.0)
    per_unit_risk = abs(entry_price - stop_loss)
    quantity = risk_usd / per_unit_risk
    position_size_usd = quantity * entry_price

    if take_profit is None:
        # Default to a 2:1 reward:risk target in the trade's direction.
        direction = 1 if stop_loss < entry_price else -1
        take_profit = entry_price + direction * 2 * per_unit_risk

    reward = abs(take_profit - entry_price)
    rr = round(reward / per_unit_risk, 2) if per_unit_risk else 0.0

    return PositionSizing(
        position_size_usd=round(position_size_usd, 2),
        quantity=round(quantity, 8),
        risk_usd=round(risk_usd, 2),
        risk_reward_ratio=rr,
        stop_loss=round(stop_loss, 8),
        take_profit=round(take_profit, 8),
    )


def volatility_adjusted_size(
    account_balance: float,
    risk_pct: float,
    entry_price: float,
    atr: float,
    atr_multiple: float = 2.0,
) -> PositionSizing:
    """Size a position using ATR (average true range) to place the stop.

    The stop sits ``atr_multiple`` ATRs below entry, so more volatile assets
    automatically get a smaller position for the same dollar risk.
    """
    if atr <= 0:
        raise ValueError("atr must be positive")
    stop_loss = entry_price - atr_multiple * atr
    return position_size(account_balance, risk_pct, entry_price, stop_loss)


def portfolio_heat(positions: list[dict]) -> dict:
    """Total open risk across positions as a % of account.

    Each position: {value_usd, entry_price, stop_loss}. 'Heat' is the sum of
    each position's risk-to-stop, expressed as a fraction of total equity.
    """
    total_equity = sum(p.get("value_usd", 0.0) for p in positions)
    if total_equity <= 0:
        return {"total_equity_usd": 0.0, "open_risk_usd": 0.0, "heat_pct": 0.0, "positions": []}

    open_risk = 0.0
    breakdown = []
    for p in positions:
        entry = p.get("entry_price", 0.0)
        stop = p.get("stop_loss")
        value = p.get("value_usd", 0.0)
        if entry > 0 and stop and stop > 0:
            qty = value / entry
            risk = qty * abs(entry - stop)
        else:
            risk = 0.0
        open_risk += risk
        breakdown.append(
            {
                "symbol": p.get("symbol", "?"),
                "value_usd": round(value, 2),
                "risk_usd": round(risk, 2),
                "weight_pct": round(value / total_equity * 100, 2),
            }
        )

    return {
        "total_equity_usd": round(total_equity, 2),
        "open_risk_usd": round(open_risk, 2),
        "heat_pct": round(open_risk / total_equity * 100, 2),
        "positions": breakdown,
    }


def suggest_stops(entry_price: float, action: str, atr: float | None = None) -> dict:
    """Suggest stop-loss / take-profit. Uses ATR if provided, else 5%/10%."""
    if atr and atr > 0:
        sl_dist, tp_dist = 2 * atr, 4 * atr
    else:
        sl_dist, tp_dist = entry_price * 0.05, entry_price * 0.10
    if action.upper() == "SELL":
        sl_dist, tp_dist = -sl_dist, -tp_dist
    return {
        "stop_loss": round(entry_price - sl_dist, 8),
        "take_profit": round(entry_price + tp_dist, 8),
    }
