"""Web3 wrapper for the NeuroMaxTrader contract on Base.

Builds and (optionally) sends swap transactions with slippage protection. All
state-changing calls require ``auto_trade_enabled`` AND a configured private key;
otherwise methods return a *prepared, unsigned* transaction dict for inspection
or external signing (e.g. MetaMask) — never silently moving funds.
"""
from __future__ import annotations

import logging
from typing import Any

from config import get_settings

logger = logging.getLogger("neuromax.contract")

# Minimal ABI matching contracts/NeuroMaxTrader.sol.
NEUROMAX_ABI = [
    {
        "inputs": [
            {"name": "tokenIn", "type": "address"},
            {"name": "tokenOut", "type": "address"},
            {"name": "amountIn", "type": "uint256"},
            {"name": "minAmountOut", "type": "uint256"},
            {"name": "deadline", "type": "uint256"},
        ],
        "name": "swap",
        "outputs": [{"name": "amountOut", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "paused",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
]


class NeuroMaxContract:
    def __init__(self) -> None:
        s = get_settings()
        self._rpc = s.base_rpc
        self._address = s.smart_contract_address
        self._pk = s.wallet_private_key
        self._auto = s.auto_trade_enabled
        self._w3 = None
        self._contract = None
        self._account = None

    def _connect(self) -> bool:
        """Lazily connect to Base. Returns False if web3/config is unavailable."""
        if self._w3 is not None:
            return True
        try:
            from web3 import Web3  # imported lazily — keeps base import light
        except ImportError:
            logger.warning("web3 not installed; on-chain features disabled")
            return False
        if not self._address:
            logger.warning("SMART_CONTRACT_ADDRESS not set")
            return False
        self._w3 = Web3(Web3.HTTPProvider(self._rpc))
        self._contract = self._w3.eth.contract(
            address=Web3.to_checksum_address(self._address), abi=NEUROMAX_ABI
        )
        if self._pk:
            self._account = self._w3.eth.account.from_key(self._pk)
        return True

    def status(self) -> dict[str, Any]:
        if not self._connect():
            return {"connected": False, "reason": "web3 unavailable or contract unconfigured"}
        try:
            return {
                "connected": bool(self._w3.is_connected()),
                "chain_id": self._w3.eth.chain_id,
                "contract": self._address,
                "owner": self._contract.functions.owner().call(),
                "paused": self._contract.functions.paused().call(),
                "auto_trade_enabled": self._auto,
            }
        except Exception as exc:  # RPC/connection issues
            logger.warning("contract status failed: %s", exc)
            return {"connected": False, "reason": str(exc)}

    def prepare_swap(
        self,
        token_in: str,
        token_out: str,
        amount_in_wei: int,
        min_amount_out_wei: int,
        deadline_ts: int,
    ) -> dict[str, Any]:
        """Build the swap transaction dict (unsigned)."""
        if not self._connect():
            return {"error": "contract unconfigured"}
        from web3 import Web3

        tx = self._contract.functions.swap(
            Web3.to_checksum_address(token_in),
            Web3.to_checksum_address(token_out),
            amount_in_wei,
            min_amount_out_wei,
            deadline_ts,
        ).build_transaction(
            {
                "from": self._account.address if self._account else Web3.to_checksum_address(self._address),
                "nonce": self._w3.eth.get_transaction_count(self._account.address) if self._account else 0,
                "gas": 300_000,
                "maxFeePerGas": self._w3.eth.gas_price,
                "maxPriorityFeePerGas": self._w3.to_wei(0.01, "gwei"),
            }
        )
        return {"transaction": tx}

    def execute_swap(self, **kwargs) -> dict[str, Any]:
        """Sign + send a swap. Hard-gated behind auto_trade_enabled + a key."""
        if not self._auto:
            return {"executed": False, "reason": "auto_trade_enabled is false (safety default)"}
        if not self._pk or not self._connect() or not self._account:
            return {"executed": False, "reason": "wallet private key / contract not configured"}
        prepared = self.prepare_swap(**kwargs)
        if "error" in prepared:
            return {"executed": False, "reason": prepared["error"]}
        try:
            signed = self._account.sign_transaction(prepared["transaction"])
            tx_hash = self._w3.eth.send_raw_transaction(signed.rawTransaction)
            return {"executed": True, "tx_hash": tx_hash.hex()}
        except Exception as exc:
            logger.warning("swap send failed: %s", exc)
            return {"executed": False, "reason": str(exc)}
