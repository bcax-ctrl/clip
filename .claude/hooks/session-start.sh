#!/bin/bash
# NeuroMax AI — SessionStart hook.
# Ensures the FastAPI AI service is ready for the session: installs Python deps
# (idempotent), starts Redis if available, and launches the AI service detached
# on :8000. Designed for Claude Code on the web; safe to re-run.
set -uo pipefail

# Only run in the remote (web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT="${CLAUDE_PROJECT_DIR:-/home/user/clip}/neuromax-ai"
AI="$PROJECT/backend/ai-service"
RUNTIME="$PROJECT/.runtime"
LOG="$RUNTIME/ai-service.log"
mkdir -p "$RUNTIME"

# Verbose install output goes to the log, not the session context.
exec 3>>"$RUNTIME/session-start.log"

log() { echo "[session-start] $*"; echo "[session-start] $*" >&3; }

# 1. Python venv + dependencies (cached across runs; pip install is a fast no-op
#    once satisfied).
cd "$AI" || { log "ai-service dir not found at $AI"; exit 0; }
if [ ! -d .venv ]; then
  log "creating venv"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
. .venv/bin/activate
log "installing python deps"
pip install -q --upgrade pip >&3 2>&1 || log "pip upgrade skipped"
pip install -q -r requirements.txt >&3 2>&1 || log "pip install had warnings (see log)"

# 2. Start Redis if the binary exists and it isn't already up. The AI service
#    degrades to in-memory storage if Redis is unavailable, so this is optional.
if command -v redis-server >/dev/null 2>&1; then
  if ! redis-cli ping >/dev/null 2>&1; then
    log "starting redis"
    redis-server --daemonize yes --save "" --appendonly no >&3 2>&1 || log "redis start failed"
  fi
else
  log "redis-server not installed; AI service will use in-memory memory"
fi

# 3. Start the AI service if it isn't already serving. Detach with setsid+nohup
#    so it outlives this hook process.
if ! curl -fsS -m 2 http://localhost:8000/health >/dev/null 2>&1; then
  log "launching AI service on :8000"
  REDIS_URL="redis://localhost:6379" setsid nohup \
    "$AI/.venv/bin/uvicorn" main:app --host 0.0.0.0 --port 8000 \
    >"$LOG" 2>&1 &
  disown 2>/dev/null || true
fi

# 4. Wait briefly for health so the session starts with a ready service.
for _ in $(seq 1 20); do
  if curl -fsS -m 2 http://localhost:8000/health >/dev/null 2>&1; then
    log "AI service healthy on :8000"
    break
  fi
  sleep 1
done

exit 0
