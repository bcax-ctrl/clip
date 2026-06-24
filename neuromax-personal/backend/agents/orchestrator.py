"""MasterOrchestrator — runs the five agents in parallel and synthesises.

Flow:
    1. Fan out all agents with ``asyncio.gather`` (true parallelism via async I/O).
    2. Collect their findings and per-agent status (for the status panel).
    3. Hand the combined findings to Claude for a structured, bilingual insight.
    4. Persist the analysis to long-term memory so future runs have context.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from claude_client import get_claude_client
from data import CryptoFeed, ForexFeed
from memory.vector_store import VectorStore

from .macro_agent import MacroAgent
from .onchain_agent import OnChainAgent
from .sentiment_agent import SentimentAgent
from .technical_agent import TechnicalAgent
from .whale_agent import WhaleAgent

logger = logging.getLogger("neuromax.orchestrator")


class MasterOrchestrator:
    def __init__(self, memory: VectorStore | None = None) -> None:
        crypto = CryptoFeed()
        forex = ForexFeed()
        self._agents = [
            SentimentAgent(),
            TechnicalAgent(crypto),
            WhaleAgent(),
            MacroAgent(forex),
            OnChainAgent(),
        ]
        self._claude = get_claude_client()
        self._memory = memory or VectorStore()

    @property
    def agent_names(self) -> list[dict[str, str]]:
        return [{"name": a.name, "label": a.label} for a in self._agents]

    async def analyze(
        self,
        symbol: str,
        user_id: str | None = None,
        query: str | None = None,
        market: str | None = None,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        symbol = symbol.upper()

        # 1-2. Parallel fan-out. return_exceptions is unnecessary because each
        # agent's run() already isolates its own failures.
        results = await asyncio.gather(*(agent.run(symbol) for agent in self._agents))

        findings = {r["agent"]: r["findings"] for r in results}
        agent_status = [
            {
                "name": r["agent"],
                "label": r["label"],
                "status": r["status"],
                "elapsed_ms": r["elapsed_ms"],
                "error": r["error"],
            }
            for r in results
        ]

        # Pass the user's actual question to the orchestrator so the synthesis
        # answers it directly (not just a generic readout).
        if query:
            findings["user_query"] = {"query": query, "market": market or "crypto"}

        # Recall relevant past analyses to give Claude continuity.
        memories = await self._memory.search(symbol, top_k=3)
        if memories:
            findings["prior_analyses"] = memories

        # 3. Synthesise with Claude.
        insight = await self._claude.synthesize(symbol, findings)

        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        analysis = {
            "symbol": symbol,
            "insight": insight,
            "agents": agent_status,
            "findings": findings,
            "elapsed_ms": elapsed_ms,
        }

        # 4. Remember this run.
        await self._memory.add(
            symbol=symbol,
            user_id=user_id,
            text=(
                f"{symbol}: {insight['action']} (risk {insight['risk_score']}, "
                f"conf {insight['confidence']}%) — {insight['summary_en']}"
            ),
            metadata={"action": insight["action"], "risk_score": insight["risk_score"]},
        )
        return analysis

    async def signals(self, symbols: list[str]) -> list[dict[str, Any]]:
        """Lightweight technical-only signals across many symbols for the feed."""
        tech = next(a for a in self._agents if a.name == "technical")
        results = await asyncio.gather(*(tech.run(s.upper()) for s in symbols))
        out = []
        for sym, res in zip(symbols, results):
            f = res["findings"]
            if not f.get("available"):
                continue
            out.append(
                {
                    "symbol": sym.upper(),
                    "bias": f["bias"],
                    "rsi": f["rsi"],
                    "macd_histogram": f["macd"]["histogram"],
                }
            )
        return out


_orchestrator: MasterOrchestrator | None = None


def get_orchestrator() -> MasterOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = MasterOrchestrator()
    return _orchestrator
