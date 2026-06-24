"""Base class shared by every specialist agent.

Each agent is fully self-contained and async. ``run`` wraps ``analyze`` with
timing, status reporting and error isolation so the orchestrator can fan out
with ``asyncio.gather`` and never have one agent's failure abort the others.
"""
from __future__ import annotations

import abc
import logging
import time
from typing import Any

logger = logging.getLogger("neuromax.agent")


class AgentResult(dict):
    """A plain dict with a known shape, for readability at call sites."""


class BaseAgent(abc.ABC):
    #: Stable machine name used as the key in the orchestrator's findings dict.
    name: str = "base"
    #: Human label shown in the agent status panel.
    label: str = "Base Agent"

    @abc.abstractmethod
    async def analyze(self, symbol: str) -> dict[str, Any]:
        """Return this agent's findings for ``symbol``. May raise."""

    async def run(self, symbol: str) -> AgentResult:
        started = time.perf_counter()
        try:
            findings = await self.analyze(symbol)
            status = "ok"
            error = None
        except Exception as exc:  # isolate: one agent must never crash the run
            logger.warning("Agent %s failed for %s: %s", self.name, symbol, exc)
            findings = {}
            status = "error"
            error = str(exc)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        return AgentResult(
            agent=self.name,
            label=self.label,
            status=status,
            error=error,
            elapsed_ms=elapsed_ms,
            findings=findings,
        )
