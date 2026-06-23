# Deploying NeuroMax AI to Railway

Railway deploys each service from its own Dockerfile and provides managed
Postgres and Redis. This repo is a **monorepo**, so each service is created
separately with a different **Root Directory**.

> Repository: `bcax-ctrl/clip` · branch `claude/vibrant-lamport-vt0g5f`
> (or merge that branch into `main` and deploy from `main`).
> The app lives under `neuromax-ai/`.

## Architecture on Railway

```
                 ┌──────────────┐
  browser ─────▶ │  frontend    │  (public)  Next.js
     │           └──────┬───────┘
     │  REST            │ NEXT_PUBLIC_API_URL
     │                  ▼
     │           ┌──────────────┐
     │           │  api-gateway │  (public)  Express   ── DATABASE_URL ─▶ Postgres
     │           └──────┬───────┘            └──────── REDIS_URL ──────▶ Redis
     │  WS              │ AI_SERVICE_URL
     │ NEXT_PUBLIC_WS_URL
     ▼                  ▼
  ┌──────────────────────────┐
  │      ai-service          │  (public)  FastAPI  ── REDIS_URL ─▶ Redis
  └──────────────────────────┘
```

Six Railway services total: **Postgres**, **Redis**, **ai-service**,
**api-gateway**, **frontend**.

---

## Step 0 — Prerequisites
- A Railway account (https://railway.app) and the GitHub repo connected.
- Your `ANTHROPIC_API_KEY`. Optional: `COINGECKO_API_KEY`,
  `ALPHA_VANTAGE_API_KEY`, `NEWS_API_KEY` (Binance & DefiLlama need none).

## Step 1 — Create the project + databases
1. Railway → **New Project** → **Deploy from GitHub repo** → pick `bcax-ctrl/clip`.
2. In the project, **+ New** → **Database** → **Add PostgreSQL**.
3. **+ New** → **Database** → **Add Redis**.

Railway now exposes `${{Postgres.DATABASE_URL}}` and `${{Redis.REDIS_URL}}` as
reference variables you'll wire into the app services below.

## Step 2 — Deploy the AI service
1. **+ New** → **GitHub Repo** → same repo → it creates a service.
2. Service → **Settings** → **Root Directory** = `neuromax-ai/backend/ai-service`.
   (The `railway.json` there pins the Dockerfile build and `/health` check.)
3. Service → **Variables**:
   ```
   ANTHROPIC_API_KEY = sk-ant-...
   ANTHROPIC_MODEL   = claude-sonnet-4-6
   REDIS_URL         = ${{Redis.REDIS_URL}}
   COINGECKO_API_KEY    = ...   (optional)
   ALPHA_VANTAGE_API_KEY = ...  (optional)
   NEWS_API_KEY         = ...   (optional)
   ```
4. Service → **Settings** → **Networking** → **Generate Domain**. Copy it,
   e.g. `https://neuromax-ai-service.up.railway.app`.

## Step 3 — Deploy the API gateway
1. **+ New** → **GitHub Repo** → same repo.
2. **Root Directory** = `neuromax-ai/backend/api-gateway`.
3. **Variables**:
   ```
   DATABASE_URL   = ${{Postgres.DATABASE_URL}}
   REDIS_URL      = ${{Redis.REDIS_URL}}
   JWT_SECRET     = <a long random string>
   JWT_EXPIRES_IN = 7d
   AI_SERVICE_URL = https://<ai-service domain from Step 2>
   ```
4. **Generate Domain**, e.g. `https://neuromax-gateway.up.railway.app`.

The gateway runs its schema migration on boot (creates `users`, `api_keys`,
`usage_events`; upgrades to a TimescaleDB hypertable if the extension exists,
otherwise stays a plain table).

## Step 4 — Deploy the frontend
The frontend bakes its API/WS URLs at **build time**, so set these *before*
deploying. (Railway passes service variables matching the Dockerfile `ARG`s.)

1. **+ New** → **GitHub Repo** → same repo.
2. **Root Directory** = `neuromax-ai/frontend`.
3. **Variables** (use the domains from Steps 2 & 3):
   ```
   NEXT_PUBLIC_API_URL = https://<gateway domain>
   NEXT_PUBLIC_WS_URL  = wss://<ai-service domain>
   ```
   > Note: `wss://` (TLS) for the WebSocket, and the AI-service domain (the
   > browser opens the price socket directly to the AI service).
4. **Generate Domain**, e.g. `https://neuromax.up.railway.app`.
5. If you set the variables after the first build, trigger a **Redeploy** so
   they're inlined.

## Step 5 — Verify
- `https://<gateway domain>/api/health` → `{"status":"ok"}`
- `https://<ai-service domain>/health` → `{"status":"ok"}`
- Open `https://<frontend domain>` → the dashboard auto-provisions a demo
  account, the price ticker connects, and **Run AI Analysis** calls Claude.

## Notes & gotchas
- **Inter-service calls use public URLs** here for simplicity and because
  uvicorn binds IPv4. To use Railway's private network instead, bind the AI
  service with `--host ::` and set `AI_SERVICE_URL=http://${{ai-service.RAILWAY_PRIVATE_DOMAIN}}:${{ai-service.PORT}}`.
- **$PORT**: every service reads Railway's injected `PORT` (the AI service via
  its start command, the gateway via `process.env.PORT`, the Next standalone
  server automatically).
- **TimescaleDB**: Railway's Postgres doesn't ship it; the gateway degrades to
  a plain `usage_events` table automatically — no action needed.
- **nginx**: the `nginx` service in `docker-compose.yml` is for local/single-host
  use. On Railway each service gets its own domain, so nginx is not deployed.
- **Costs**: 5 always-on services + 2 databases. Use Railway's usage limits.
