"""NeuroMax AI service — FastAPI app exposing the analysis API and price WS.

Endpoints (per the platform spec):
    POST /api/v1/analyze            main analysis query
    GET  /api/v1/markets            top markets (heatmap / explorer)
    GET  /api/v1/markets/{symbol}   market data for one symbol
    GET  /api/v1/sentiment/{symbol} sentiment score
    GET  /api/v1/whales             whale activity feed
    GET  /api/v1/signals            trading signals
    POST /api/v1/portfolio          portfolio analysis
    POST /api/v1/chat               streaming chat with the orchestrator (SSE)
    GET  /api/v1/agents             agent roster + status
    WS   /ws/prices                 real-time price stream
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agents import get_orchestrator
from claude_client import get_claude_client
from data import CryptoFeed, ForexFeed, StocksFeed

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("neuromax.api")

app = FastAPI(title="NeuroMax AI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

crypto = CryptoFeed()
stocks = StocksFeed()
forex = ForexFeed()


# ─── Request models ──────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    symbol: str = Field(..., examples=["BTC"])
    user_id: str | None = None


class ChatRequest(BaseModel):
    message: str
    symbol: str | None = None


class PortfolioHolding(BaseModel):
    symbol: str
    amount: float


class PortfolioRequest(BaseModel):
    holdings: list[PortfolioHolding]
    user_id: str | None = None


# ─── REST endpoints ───────────────────────────────────────────────────────────
@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "neuromax-ai"}


@app.get("/api/v1/agents")
async def list_agents() -> dict[str, Any]:
    return {"agents": get_orchestrator().agent_names}


@app.post("/api/v1/analyze")
async def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    return await get_orchestrator().analyze(req.symbol, user_id=req.user_id)


@app.get("/api/v1/markets")
async def markets(limit: int = 20) -> dict[str, Any]:
    return {"markets": await crypto.get_top_markets(limit=limit)}


@app.get("/api/v1/markets/{symbol}")
async def market(symbol: str) -> dict[str, Any]:
    price, meta = await asyncio.gather(
        crypto.get_price(symbol), crypto.get_market_data(symbol)
    )
    return {**price, **meta}


@app.get("/api/v1/sentiment/{symbol}")
async def sentiment(symbol: str) -> dict[str, Any]:
    from agents.sentiment_agent import SentimentAgent

    result = await SentimentAgent().run(symbol)
    return {"symbol": symbol.upper(), **result["findings"]}


@app.get("/api/v1/whales")
async def whales(symbol: str = "BTC") -> dict[str, Any]:
    from agents.whale_agent import WhaleAgent

    result = await WhaleAgent().run(symbol)
    return {"symbol": symbol.upper(), **result["findings"]}


@app.get("/api/v1/signals")
async def signals(symbols: str = "BTC,ETH,SOL,BNB,XRP") -> dict[str, Any]:
    syms = [s.strip() for s in symbols.split(",") if s.strip()]
    return {"signals": await get_orchestrator().signals(syms)}


@app.post("/api/v1/portfolio")
async def portfolio(req: PortfolioRequest) -> dict[str, Any]:
    """Value the portfolio and run a quick signal pass over its holdings."""
    prices = await asyncio.gather(*(crypto.get_price(h.symbol) for h in req.holdings))
    positions = []
    total = 0.0
    for h, p in zip(req.holdings, prices):
        value = p["price"] * h.amount
        total += value
        positions.append(
            {
                "symbol": h.symbol.upper(),
                "amount": h.amount,
                "price": p["price"],
                "value_usd": round(value, 2),
                "change_24h": p["change_24h"],
            }
        )
    for pos in positions:
        pos["weight_pct"] = round((pos["value_usd"] / total) * 100, 2) if total else 0.0
    sig = await get_orchestrator().signals([p["symbol"] for p in positions])
    return {"total_value_usd": round(total, 2), "positions": positions, "signals": sig}


@app.post("/api/v1/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    """Stream a chat reply as Server-Sent Events."""
    claude = get_claude_client()
    context: dict[str, Any] | None = None
    if req.symbol:
        context = await market(req.symbol)

    async def event_stream():
        async for chunk in claude.stream_chat(req.message, context):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ─── WebSocket: real-time prices ───────────────────────────────────────────────
@app.websocket("/ws/prices")
async def ws_prices(ws: WebSocket) -> None:
    """Stream live prices for the symbols the client subscribes to.

    Protocol: client sends ``{"symbols": ["BTC", "ETH"]}`` (may resend to update
    the subscription). Server pushes ``{"type": "prices", "data": [...]}`` ~every
    2 seconds. Keeps the connection open until the client disconnects.
    """
    await ws.accept()
    symbols = ["BTC", "ETH", "SOL"]
    try:
        while True:
            # Non-blocking check for a new subscription message.
            try:
                msg = await asyncio.wait_for(ws.receive_text(), timeout=0.05)
                parsed = json.loads(msg)
                if isinstance(parsed.get("symbols"), list) and parsed["symbols"]:
                    symbols = [str(s).upper() for s in parsed["symbols"]][:25]
            except (asyncio.TimeoutError, json.JSONDecodeError, KeyError):
                pass

            prices = await asyncio.gather(*(crypto.get_price(s) for s in symbols))
            await ws.send_json({"type": "prices", "data": prices})
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        logger.info("price websocket disconnected")
    except Exception as exc:  # pragma: no cover
        logger.warning("price websocket error: %s", exc)
        await ws.close()
