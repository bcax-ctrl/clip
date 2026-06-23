"""Thin async wrapper around the Anthropic SDK.

The orchestrator uses two capabilities here:

* :meth:`ClaudeClient.synthesize` — a single structured-output call that turns
  the five agents' findings into an actionable, bilingual insight.
* :meth:`ClaudeClient.stream_chat` — a token stream for the dashboard chat UI.

Model defaults to ``claude-sonnet-4-6`` (the project default) and uses adaptive
thinking, per the Anthropic API guidance. The optional GPT-4 fallback is wired
as an explicit extension point: it only activates if ``OPENAI_API_KEY`` is set
*and* the ``openai`` package is installed, so the core path stays Claude-only.
"""
from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

import anthropic

from config import get_settings

logger = logging.getLogger("neuromax.claude")

# JSON schema the model must fill in. No min/max constraints — those aren't
# supported by strict structured outputs, so ranges are enforced client-side.
_INSIGHT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "risk_score": {
            "type": "integer",
            "description": "Overall risk on a 1 (very safe) to 10 (very risky) scale.",
        },
        "confidence": {
            "type": "integer",
            "description": "Confidence in the recommendation, 0-100 percent.",
        },
        "action": {
            "type": "string",
            "enum": ["BUY", "SELL", "HOLD", "WATCH"],
            "description": "The single recommended action.",
        },
        "key_signals": {
            "type": "array",
            "items": {"type": "string"},
            "description": "3-6 concise bullet signals driving the recommendation.",
        },
        "summary_en": {
            "type": "string",
            "description": "A 2-4 sentence actionable summary in English.",
        },
        "summary_id": {
            "type": "string",
            "description": "The same summary in Bahasa Indonesia.",
        },
    },
    "required": [
        "risk_score",
        "confidence",
        "action",
        "key_signals",
        "summary_en",
        "summary_id",
    ],
    "additionalProperties": False,
}

_SYSTEM_PROMPT = (
    "You are the MasterOrchestrator of NeuroMax AI, a multi-asset financial "
    "intelligence platform. You receive structured findings from five specialist "
    "agents (sentiment, technical, whale-tracking, macro, on-chain). Synthesise "
    "them into one decisive, risk-aware recommendation for a retail or pro trader. "
    "Be specific and reference concrete signals. Never give financial advice as a "
    "guarantee — frame it as analysis. Always produce both an English and a Bahasa "
    "Indonesia summary with equivalent meaning."
)


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


class ClaudeClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._model = settings.anthropic_model
        self._max_tokens = settings.max_tokens
        # The SDK reads ANTHROPIC_API_KEY from the env automatically, but we pass
        # it explicitly so a missing key fails fast and clearly.
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key or None)
        self._openai_key = settings.openai_api_key

    async def synthesize(self, symbol: str, findings: dict[str, Any]) -> dict[str, Any]:
        """Turn agent findings into a structured, validated insight."""
        user_content = (
            f"Asset under analysis: {symbol}\n\n"
            f"Agent findings (JSON):\n{json.dumps(findings, indent=2, default=str)}\n\n"
            "Synthesise these into a single recommendation."
        )
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=self._max_tokens,
                thinking={"type": "adaptive"},
                system=_SYSTEM_PROMPT,
                output_config={"format": {"type": "json_schema", "schema": _INSIGHT_SCHEMA}},
                messages=[{"role": "user", "content": user_content}],
            )
            text = next((b.text for b in response.content if b.type == "text"), "{}")
            data = json.loads(text)
        except anthropic.APIError as exc:
            logger.warning("Claude synthesize failed: %s", exc)
            data = await self._fallback_synthesis(symbol, findings)
        except (json.JSONDecodeError, StopIteration) as exc:
            logger.warning("Could not parse Claude output: %s", exc)
            data = await self._fallback_synthesis(symbol, findings)

        # Enforce ranges the schema can't express.
        data["risk_score"] = _clamp(int(data.get("risk_score", 5)), 1, 10)
        data["confidence"] = _clamp(int(data.get("confidence", 50)), 0, 100)
        if data.get("action") not in {"BUY", "SELL", "HOLD", "WATCH"}:
            data["action"] = "WATCH"
        return data

    async def stream_chat(
        self, message: str, context: dict[str, Any] | None = None
    ) -> AsyncIterator[str]:
        """Yield response text chunks for the chat interface."""
        ctx = f"\n\nRelevant context:\n{json.dumps(context, default=str)}" if context else ""
        try:
            async with self._client.messages.stream(
                model=self._model,
                max_tokens=self._max_tokens,
                thinking={"type": "adaptive"},
                system=_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": message + ctx}],
            ) as stream:
                async for chunk in stream.text_stream:
                    yield chunk
        except anthropic.APIError as exc:
            logger.warning("Claude stream failed: %s", exc)
            yield f"[NeuroMax] The analysis engine is temporarily unavailable ({exc})."

    async def _fallback_synthesis(
        self, symbol: str, findings: dict[str, Any]
    ) -> dict[str, Any]:
        """Deterministic fallback when the LLM is unreachable.

        If a GPT-4 fallback is configured it is used; otherwise we derive a
        conservative recommendation from the technical agent's numbers so the
        product degrades gracefully instead of erroring.
        """
        gpt = await self._maybe_gpt4(symbol, findings)
        if gpt is not None:
            return gpt

        tech = findings.get("technical", {})
        rsi = tech.get("rsi", 50) or 50
        if rsi >= 70:
            action, risk = "SELL", 7
        elif rsi <= 30:
            action, risk = "BUY", 6
        else:
            action, risk = "HOLD", 5
        return {
            "risk_score": risk,
            "confidence": 40,
            "action": action,
            "key_signals": [f"RSI at {rsi:.0f}", "LLM unavailable — heuristic fallback"],
            "summary_en": f"Heuristic read on {symbol}: {action} (RSI {rsi:.0f}).",
            "summary_id": f"Analisis heuristik {symbol}: {action} (RSI {rsi:.0f}).",
        }

    async def _maybe_gpt4(
        self, symbol: str, findings: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Optional GPT-4 fallback. No-op unless explicitly configured."""
        if not self._openai_key:
            return None
        try:
            from openai import AsyncOpenAI  # imported lazily; not a core dependency
        except ImportError:
            logger.info("OPENAI_API_KEY set but openai package not installed; skipping.")
            return None
        try:
            client = AsyncOpenAI(api_key=self._openai_key)
            completion = await client.chat.completions.create(
                model="gpt-4o",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"Asset: {symbol}. Findings: {json.dumps(findings, default=str)}. "
                            "Return JSON with keys risk_score, confidence, action, "
                            "key_signals, summary_en, summary_id."
                        ),
                    },
                ],
            )
            return json.loads(completion.choices[0].message.content or "{}")
        except Exception as exc:  # pragma: no cover - best-effort fallback
            logger.warning("GPT-4 fallback failed: %s", exc)
            return None


_client: ClaudeClient | None = None


def get_claude_client() -> ClaudeClient:
    global _client
    if _client is None:
        _client = ClaudeClient()
    return _client
