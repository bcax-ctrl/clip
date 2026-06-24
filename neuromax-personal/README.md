# NeuroMax Personal

A single, comprehensive AI trading terminal for personal use. Everything in one
interface: AI analysis, portfolio, trade planning, charts, alerts, and
backtesting — backed by **one** FastAPI service, a **Base-chain** contract, and
**Supabase** (with an in-memory fallback so it runs keyless).

```
frontend (Next.js 14, tabbed terminal)
        │ REST + WS
        ▼
backend (FastAPI — one service)
  ├── agents/      5 specialists + Claude orchestrator (claude-sonnet-4-6)
  ├── portfolio/   Binance read-only sync (P&L, weights, diversification)
  ├── trading/     risk_calculator · executor · smart_contract (web3 → Base)
  ├── data/        historical OHLCV · backtester (win rate / Sharpe / drawdown)
  ├── notifications/ alert rule engine (+ browser push, email)
  └── db/          Supabase store (in-memory fallback) + schema.sql
        │
        ▼
contracts/NeuroMaxTrader.sol  →  Uniswap V3 on Base (owner-gated, slippage-safe)
```

## Features
1. **AI Analysis** — 5 agents in parallel → Claude synthesis → BUY/SELL/HOLD/WATCH
   + risk score + confidence, bilingual (EN/ID). Auto-runs every 5 minutes.
2. **Portfolio** — read-only Binance sync, real-time P&L, weights, diversification,
   portfolio heat.
3. **Trade** — risk-based position sizing, R:R, stops, slippage-bounded plans;
   on-chain execution via the Base contract (off by default).
4. **Charts** — TradingView Lightweight Charts, candles + EMA20/50, multi-timeframe.
5. **Alerts** — composite rules ("RSI > 70 AND sentiment == bullish"), browser
   push + email, evaluated against the 5-minute analysis loop.
6. **Backtesting** — sma_cross / rsi / macd strategies on historical data; win
   rate, Sharpe, max drawdown, equity-curve replay.
7. **Risk** — position sizing, volatility (ATR) sizing, portfolio heat, stop/TP.

## Quick start (Docker)
```bash
cd neuromax-personal
cp .env.example .env          # set ANTHROPIC_API_KEY (everything else optional)
docker compose up --build
# frontend  → http://localhost:3000
# backend   → http://localhost:8000/health
```
Runs without Supabase (in-memory store), without Binance (empty portfolio), and
without an Anthropic key (heuristic synthesis) — each feature lights up as you
add the corresponding credential.

## API
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` | JWT auth (optional, single-user) |
| POST | `/api/analyze` | AI analysis + signal (`{symbol}` or `{query,market}`) |
| GET  | `/api/portfolio` | Binance holdings + P&L + heat |
| POST | `/api/trade` | Risk-managed trade plan (+ optional execution) |
| GET  | `/api/markets/{symbol}` | Market data |
| GET  | `/api/signals` | Stored signals |
| POST | `/api/backtest` | Run a strategy backtest |
| GET/POST | `/api/alerts` | List / create alert rules |
| GET  | `/api/alerts/triggered` | Browser-push feed |
| POST | `/api/risk/position-size` | Position sizing calculator |
| GET  | `/api/performance` | Trading stats |
| GET  | `/api/contract/status` | Base contract status |
| WS   | `/ws/prices` | Live price stream |

## Smart contract
See [`contracts/README.md`](./contracts/README.md). Compiles with solc 0.8.24
(verified). `onlyOwner`, on-chain slippage (`minAmountOut`) + deadline, pause
switch, emergency withdraw. Deploy with `contracts/deploy.js`.

> ⚠️ **Auto-trading is OFF by default** (`AUTO_TRADE_ENABLED=false`). Wiring a
> private key to auto-swap real funds is dangerous — test on Base Sepolia with
> tiny amounts first, and keep the kill switch (`setPaused`) in mind.

## Supabase
Run [`backend/db/schema.sql`](./backend/db/schema.sql) in the Supabase SQL editor,
then set `SUPABASE_URL`/`SUPABASE_KEY`. Without them the app uses a non-persistent
in-memory store.

## What was validated locally
- ✅ Backend boots; every endpoint exercised (`analyze`, `trade`, `risk`,
  `alerts`, `signals`, `performance`, `auth`, `contract/status`).
- ✅ Risk calculator + backtester unit-tested (sizing math, Sharpe, drawdown).
- ✅ Smart contract compiles (solc 0.8.24, ~11.6KB bytecode).
- ✅ Frontend builds clean (Next.js production build, type-checked).

**Not testable in the build sandbox** (need live creds / open network / funds):
live Binance/CoinGecko data, real Claude calls, Supabase persistence, and
on-chain execution. These are wired and degrade gracefully until configured.
