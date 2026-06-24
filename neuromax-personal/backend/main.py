"""NeuroMax Personal — single FastAPI backend for the whole platform.

Endpoints:
    POST /api/auth/register | /api/auth/login
    POST /api/analyze              AI analysis + signal (stored)
    GET  /api/portfolio            Binance read-only holdings + P&L
    POST /api/trade                Plan/execute a risk-managed trade
    GET  /api/markets/{symbol}     Market data
    GET  /api/signals              Stored signals
    POST /api/backtest             Run a strategy backtest
    GET/POST /api/alerts           List / create alert rules
    GET  /api/alerts/triggered     Recently fired alerts (browser-push feed)
    POST /api/risk/position-size   Position sizing calculator
    GET  /api/performance          Trading performance stats
    GET  /api/contract/status      Base-chain contract status
    WS   /ws/prices                Live price stream
"""
from __future__ import annotations

import asyncio
import collections
import contextlib
import json
import logging
import re
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import auth
from agents import get_orchestrator
from data import CryptoFeed
from data.backtester import run_backtest
from data.historical import load_ohlcv
from db import get_store
from notifications.alerts import AlertEngine, evaluate_rule, metrics_from_analysis
from portfolio import BinanceSync
from trading import TradeExecutor, portfolio_heat, position_size

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("neuromax.personal")

app = FastAPI(title="NeuroMax Personal", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

crypto = CryptoFeed()
binance = BinanceSync()
executor = TradeExecutor()
alert_engine = AlertEngine()
store = get_store()

WATCHLIST = ["BTC", "ETH", "SOL"]
_triggered: collections.deque = collections.deque(maxlen=50)
_NAME_TO_TICKER = {
    "btc": "BTC", "bitcoin": "BTC", "eth": "ETH", "ethereum": "ETH", "sol": "SOL",
    "solana": "SOL", "bnb": "BNB", "xrp": "XRP", "ada": "ADA", "doge": "DOGE", "avax": "AVAX",
}


# ─── Auth (optional for personal use; scopes data by user) ──────────────────────
def current_user(authorization: str | None = Header(default=None)) -> str:
    """Return the user id from a Bearer token, or 'local' for single-user mode."""
    if authorization and authorization.startswith("Bearer "):
        with contextlib.suppress(Exception):
            return auth.verify_token(authorization[7:]).get("sub", "local")
    return "local"


# ─── Models ─────────────────────────────────────────────────────────────────────
class Credentials(BaseModel):
    email: str
    password: str


class AnalyzeRequest(BaseModel):
    symbol: str | None = None
    query: str | None = None
    market: str | None = None


class TradeRequest(BaseModel):
    symbol: str
    action: str
    entry_price: float
    account_balance: float
    risk_pct: float = 1.0
    stop_loss: float | None = None
    execute: bool = False
    token_in: str = "USDC"
    token_out: str = "ETH"


class BacktestRequest(BaseModel):
    symbol: str
    strategy: str = "sma_cross"
    params: dict[str, Any] = Field(default_factory=dict)
    interval: str = "1d"
    days: int = 365
    initial_capital: float = 10_000.0


class AlertRequest(BaseModel):
    name: str
    rule: dict[str, Any]
    symbol: str | None = None


class PositionSizeRequest(BaseModel):
    account_balance: float
    risk_pct: float
    entry_price: float
    stop_loss: float
    take_profit: float | None = None


def _resolve_symbol(req: AnalyzeRequest) -> str:
    if req.symbol:
        return req.symbol.upper()
    for tok in re.findall(r"[a-zA-Z]+", req.query or ""):
        if tok.lower() in _NAME_TO_TICKER:
            return _NAME_TO_TICKER[tok.lower()]
    return "BTC"


# ─── Auth endpoints ──────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register(creds: Credentials) -> dict[str, Any]:
    existing = store.select("users", {"email": creds.email.lower()}, limit=1)
    if existing:
        raise HTTPException(409, "User already exists")
    user = store.insert(
        "users", {"email": creds.email.lower(), "password_hash": auth.hash_password(creds.password), "settings": {}}
    )
    return {"token": auth.issue_token(user["id"], user["email"]), "user": {"id": user["id"], "email": user["email"]}}


@app.post("/api/auth/login")
async def login(creds: Credentials) -> dict[str, Any]:
    rows = store.select("users", {"email": creds.email.lower()}, limit=1)
    if not rows or rows[0]["password_hash"] != auth.hash_password(creds.password):
        raise HTTPException(401, "Invalid credentials")
    user = rows[0]
    return {"token": auth.issue_token(user["id"], user["email"]), "user": {"id": user["id"], "email": user["email"]}}


# ─── Core endpoints ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "service": "neuromax-personal", "store": store.backend}


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest, user: str = Depends(current_user)) -> dict[str, Any]:
    if not req.symbol and not req.query:
        raise HTTPException(422, "Provide 'symbol' or 'query'.")
    symbol = _resolve_symbol(req)
    result = await get_orchestrator().analyze(symbol, user_id=user, query=req.query, market=req.market)
    # Persist the signal.
    ins = result["insight"]
    store.insert(
        "signals",
        {"user_id": user, "symbol": symbol, "action": ins["action"],
         "confidence": ins["confidence"], "risk_score": ins["risk_score"]},
    )
    return result


@app.get("/api/portfolio")
async def get_portfolio() -> dict[str, Any]:
    data = await binance.get_portfolio()
    if data.get("holdings"):
        data["heat"] = portfolio_heat(
            [{"symbol": h["symbol"], "value_usd": h["value_usd"],
              "entry_price": h["price"], "stop_loss": h["price"] * 0.9} for h in data["holdings"]]
        )
    return data


@app.get("/api/markets/{symbol}")
async def market(symbol: str) -> dict[str, Any]:
    price, meta = await asyncio.gather(crypto.get_price(symbol), crypto.get_market_data(symbol))
    return {**price, **meta}


@app.post("/api/trade")
async def trade(req: TradeRequest, user: str = Depends(current_user)) -> dict[str, Any]:
    plan = executor.plan_trade(
        req.symbol, req.action, req.entry_price, req.account_balance,
        risk_pct=req.risk_pct, stop_loss=req.stop_loss,
    )
    if "error" in plan:
        raise HTTPException(400, plan["error"])
    result: dict[str, Any] = {"plan": plan}
    if req.execute:
        result["execution"] = executor.execute(plan, req.token_in, req.token_out)
    store.insert(
        "trades",
        {"user_id": user, "symbol": req.symbol.upper(), "action": req.action.upper(),
         "price": req.entry_price, "amount": plan["quantity"], "executed": req.execute},
    )
    return result


@app.get("/api/signals")
async def signals(user: str = Depends(current_user), limit: int = 50) -> dict[str, Any]:
    return {"signals": store.select("signals", {"user_id": user}, limit=limit)}


@app.post("/api/backtest")
async def backtest(req: BacktestRequest, user: str = Depends(current_user)) -> dict[str, Any]:
    candles = await load_ohlcv(req.symbol, interval=req.interval, limit=req.days)
    if len(candles) < 30:
        raise HTTPException(422, "Not enough historical data for this symbol/interval.")
    result = run_backtest(candles, strategy=req.strategy, params=req.params, initial_capital=req.initial_capital)
    store.insert(
        "backtest_results",
        {"user_id": user, "symbol": req.symbol.upper(), "strategy": req.strategy,
         "params": req.params, "stats": {k: result[k] for k in
                                         ("total_return_pct", "win_rate_pct", "sharpe_ratio", "max_drawdown_pct")
                                         if k in result}},
    )
    return result


@app.get("/api/alerts")
async def list_alerts(user: str = Depends(current_user)) -> dict[str, Any]:
    return {"alerts": store.select("alerts", {"user_id": user})}


@app.post("/api/alerts")
async def create_alert(req: AlertRequest, user: str = Depends(current_user)) -> dict[str, Any]:
    return store.insert(
        "alerts", {"user_id": user, "name": req.name, "rule": req.rule, "symbol": req.symbol, "status": "active"}
    )


@app.get("/api/alerts/triggered")
async def triggered_alerts() -> dict[str, Any]:
    return {"triggered": list(_triggered)}


@app.post("/api/risk/position-size")
async def risk_position_size(req: PositionSizeRequest) -> dict[str, Any]:
    sizing = position_size(req.account_balance, req.risk_pct, req.entry_price, req.stop_loss, req.take_profit)
    return sizing.__dict__


@app.get("/api/performance")
async def performance(user: str = Depends(current_user)) -> dict[str, Any]:
    trades = store.select("trades", {"user_id": user}, limit=1000)
    signals_ = store.select("signals", {"user_id": user}, limit=1000)
    by_action: dict[str, int] = collections.Counter(s["action"] for s in signals_)
    return {
        "total_trades": len(trades),
        "total_signals": len(signals_),
        "signal_distribution": dict(by_action),
        "recent_trades": trades[:10],
    }


@app.get("/api/contract/status")
async def contract_status() -> dict[str, Any]:
    from trading.smart_contract import NeuroMaxContract

    return NeuroMaxContract().status()


# ─── WebSocket: live prices ──────────────────────────────────────────────────────
@app.websocket("/ws/prices")
async def ws_prices(ws: WebSocket) -> None:
    await ws.accept()
    symbols = list(WATCHLIST)
    try:
        while True:
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
        logger.info("price ws disconnected")


# ─── Background: 5-minute auto-analysis + alert evaluation ───────────────────────
async def _auto_analysis_loop() -> None:
    orchestrator = get_orchestrator()
    while True:
        try:
            for symbol in WATCHLIST:
                result = await orchestrator.analyze(symbol, user_id="local")
                ins = result["insight"]
                store.insert(
                    "signals",
                    {"user_id": "local", "symbol": symbol, "action": ins["action"],
                     "confidence": ins["confidence"], "risk_score": ins["risk_score"], "auto": True},
                )
                metrics = metrics_from_analysis(result)
                for alert in store.select("alerts", {"status": "active"}, limit=200):
                    if alert.get("symbol") and alert["symbol"].upper() != symbol:
                        continue
                    if evaluate_rule(alert.get("rule", {}), metrics):
                        event = {"alert": alert["name"], "symbol": symbol,
                                 "action": ins["action"], "metrics": metrics}
                        _triggered.appendleft(event)
                        logger.info("ALERT fired: %s on %s", alert["name"], symbol)
        except Exception as exc:  # keep the loop alive
            logger.warning("auto-analysis loop error: %s", exc)
        await asyncio.sleep(300)  # 5 minutes


@app.on_event("startup")
async def _startup() -> None:
    # Disabled by default in non-prod via env to avoid burning API calls; the
    # loop is cheap (no key -> heuristic) and demonstrates the scheduler.
    import os

    if os.getenv("ENABLE_AUTO_ANALYSIS", "true").lower() == "true":
        asyncio.create_task(_auto_analysis_loop())
        logger.info("auto-analysis loop scheduled (every 5 min)")
