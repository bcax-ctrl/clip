# NeuroMax AI — Financial Intelligence Platform

A production-grade, multi-agent, multi-asset market intelligence platform.
Five specialist AI agents run **in parallel** and report to a Claude-powered
**MasterOrchestrator** that synthesises one decisive, risk-scored, **bilingual
(EN + ID)** recommendation.

```
┌─────────────┐   REST/WS   ┌──────────────┐   HTTP   ┌────────────────────┐
│  Next.js 14 │ ───────────▶│ API Gateway  │ ───────▶ │  FastAPI AI service │
│  (frontend) │             │ (Express)    │          │  5 agents + Claude  │
└─────────────┘             │ JWT/keys/RL  │          └─────────┬──────────┘
       ▲  WS /ws/prices                                          │
       └──────────────────────────────────────────────────────► │  (live prices)
                                                                 ▼
                                  PostgreSQL + TimescaleDB · Redis
```

## What's inside

| Layer        | Tech                                                                 |
|--------------|----------------------------------------------------------------------|
| Frontend     | Next.js 14 (App Router), TailwindCSS, Zustand, TradingView Lightweight Charts |
| API gateway  | Node.js / Express — JWT + API keys, tiered rate limiting, usage metering |
| AI service   | Python / FastAPI — 5 asyncio agents + Claude orchestrator (`claude-sonnet-4-6`) |
| Data         | PostgreSQL + TimescaleDB, Redis (memory + rate limits)               |
| Market data  | Binance, CoinGecko, Alpha Vantage, NewsAPI, DefiLlama                |

### The five agents
- **SentimentAgent** — news/social sentiment scored on a −100…+100 scale.
- **TechnicalAgent** — RSI, MACD, Bollinger Bands, EMA from live candles.
- **WhaleAgent** — large order-flow detection and net buy/sell pressure.
- **MacroAgent** — USD strength (DXY proxy) and risk-on/off regime.
- **OnChainAgent** — chain TVL and momentum (DefiLlama).

The **MasterOrchestrator** fans them out with `asyncio.gather`, recalls relevant
prior analyses from long-term memory, and asks Claude for a structured insight:
risk score (1–10), confidence %, action (BUY/SELL/HOLD/WATCH), key signals, and
both an English and a Bahasa Indonesia summary.

> **Model choice:** the project default is `claude-sonnet-4-6` (set via
> `ANTHROPIC_MODEL`). An optional GPT-4 fallback in `claude_client.py` only
> activates if `OPENAI_API_KEY` is set *and* the `openai` package is installed —
> the core path is Claude-only.

## Quick start (Docker)

```bash
cd neuromax-ai
cp .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY. Other data keys are optional
# (the platform degrades gracefully without them; Binance & DefiLlama need none).

docker compose up --build
```

Then open:
- **Frontend** → http://localhost:3000
- **API gateway** → http://localhost:4000/api/health
- **AI service** → http://localhost:8000/health
- **Nginx reverse proxy** (single entry) → http://localhost:8080

The dashboard auto-provisions a demo account on first load, so it works
immediately without manual signup.

## Quick start (local, without Docker)

Three terminals:

```bash
# 1. Datastores
docker compose up -d postgres redis

# 2. AI service
cd backend/ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export $(grep -v '^#' ../../.env | xargs)   # or set vars manually
uvicorn main:app --reload --port 8000

# 3. API gateway
cd backend/api-gateway
npm install
node index.js

# 4. Frontend
cd frontend
npm install
npm run dev
```

## API reference

### AI service (FastAPI, :8000)
| Method | Path                          | Purpose                          |
|--------|-------------------------------|----------------------------------|
| POST   | `/api/v1/analyze`             | Full multi-agent analysis        |
| GET    | `/api/v1/markets`             | Top markets (heatmap/explorer)   |
| GET    | `/api/v1/markets/{symbol}`    | Single-asset market data         |
| GET    | `/api/v1/sentiment/{symbol}`  | Sentiment score + headlines      |
| GET    | `/api/v1/whales?symbol=BTC`   | Whale activity feed              |
| GET    | `/api/v1/signals?symbols=...` | Technical trading signals        |
| POST   | `/api/v1/portfolio`           | Portfolio valuation + signals    |
| POST   | `/api/v1/chat`                | Streaming chat (SSE)             |
| WS     | `/ws/prices`                  | Real-time price stream           |

### API gateway (Express, :4000)
| Method | Path                        | Notes                              |
|--------|-----------------------------|------------------------------------|
| POST   | `/api/auth/register`        | Create account → JWT               |
| POST   | `/api/auth/login`           | → JWT                              |
| POST   | `/api/auth/keys`            | Mint a NeuroAPI key (shown once)   |
| GET    | `/api/auth/keys`            | List keys (prefixes only)          |
| `*`    | `/api/markets/*`            | Auth + rate-limited proxy          |
| `*`    | `/api/agents/*`             | Auth + rate-limited proxy          |
| GET    | `/api/usage`                | Per-user usage (24h)               |

Authenticate with `Authorization: Bearer <jwt>` **or** `x-api-key: nmx_live_...`.

### Rate-limit tiers
| Tier        | Requests / minute |
|-------------|-------------------|
| free        | 30                |
| pro         | 300               |
| enterprise  | 3000              |

## Environment variables

See [`.env.example`](./.env.example). The only required key for AI synthesis is
`ANTHROPIC_API_KEY`. Without the optional market-data keys, the relevant agents
return neutral/empty findings and the orchestrator still produces a
recommendation (Binance prices/candles and DefiLlama TVL need no key).

## Project layout

```
neuromax-ai/
├── frontend/            # Next.js 14 terminal UI
├── backend/
│   ├── ai-service/      # FastAPI: agents/, memory/, data/, claude_client.py
│   └── api-gateway/     # Express: routes/, middleware/, init.sql
├── nginx/               # Reverse proxy
├── docker-compose.yml
└── .env.example
```

## Notes & honest scope
- **Whale tracking** approximates on-chain whales via Binance aggregated-trade
  flow (free tier); a true on-chain tracker would add a node/indexer.
- **DXY** is a directional USD-strength proxy from major FX pairs, not the
  official index.
- The **social leaderboard** uses representative demo data; **community signals**
  on that page are live from the signals endpoint.
- Realtime uses native **WebSocket** against the FastAPI service (the gateway
  proxies REST; the browser opens the price socket directly / via nginx).
