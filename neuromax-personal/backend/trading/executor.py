"""High-level trade executor.

Ties together risk sizing, slippage protection and the on-chain contract. By
default it returns a *prepared trade plan* (sized, with stops and a min-out
computed from the slippage cap) rather than executing — execution only happens
when auto_trade_enabled is true and a wallet is configured.
"""
from __future__ import annotations

import time
from typing import Any

from config import get_settings

from .risk_calculator import position_size, suggest_stops
from .smart_contract import NeuroMaxContract

# Common Base-chain token addresses (extend as needed).
BASE_TOKENS = {
    "ETH": "0x4200000000000000000000000000000000000006",  # WETH on Base
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "DAI": "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    "cbBTC": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
}


class TradeExecutor:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._contract = NeuroMaxContract()

    def plan_trade(
        self,
        symbol: str,
        action: str,
        entry_price: float,
        account_balance: float,
        risk_pct: float = 1.0,
        stop_loss: float | None = None,
        atr: float | None = None,
    ) -> dict[str, Any]:
        """Compute a sized, risk-managed trade plan with stops + slippage bounds."""
        action = action.upper()
        if action not in {"BUY", "SELL"}:
            return {"error": "action must be BUY or SELL"}

        if stop_loss is None:
            stop_loss = suggest_stops(entry_price, action, atr)["stop_loss"]
        sizing = position_size(account_balance, risk_pct, entry_price, stop_loss)

        slippage = self._settings.max_slippage_bps / 10_000.0
        # For a BUY, min tokens out = notional/price adjusted down for slippage.
        expected_out = sizing.quantity
        min_out = expected_out * (1 - slippage)

        return {
            "symbol": symbol.upper(),
            "action": action,
            "entry_price": entry_price,
            "position_size_usd": sizing.position_size_usd,
            "quantity": sizing.quantity,
            "risk_usd": sizing.risk_usd,
            "risk_reward_ratio": sizing.risk_reward_ratio,
            "stop_loss": sizing.stop_loss,
            "take_profit": sizing.take_profit,
            "max_slippage_pct": round(slippage * 100, 3),
            "min_amount_out": round(min_out, 8),
            "auto_trade_enabled": self._settings.auto_trade_enabled,
        }

    def execute(self, plan: dict[str, Any], token_in: str, token_out: str) -> dict[str, Any]:
        """Execute (or prepare) the on-chain swap for a plan.

        Returns a prepared transaction unless auto-trade is enabled, in which
        case it signs and sends via the contract.
        """
        tin = BASE_TOKENS.get(token_in.upper(), token_in)
        tout = BASE_TOKENS.get(token_out.upper(), token_out)
        deadline = int(time.time()) + 600  # 10 minutes

        # Amounts are in token base units; the caller is responsible for decimals.
        amount_in_wei = int(plan["position_size_usd"])  # placeholder unit; see note
        min_out_wei = int(plan["min_amount_out"])

        if not self._settings.auto_trade_enabled:
            prepared = self._contract.prepare_swap(tin, tout, amount_in_wei, min_out_wei, deadline)
            return {"executed": False, "mode": "prepared", **prepared}
        return self._contract.execute_swap(
            token_in=tin, token_out=tout,
            amount_in_wei=amount_in_wei, min_amount_out_wei=min_out_wei,
            deadline_ts=deadline,
        )
