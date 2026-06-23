-- NeuroMax schema. Loaded automatically by the postgres container on first boot.
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS users (
    id           BIGSERIAL PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    tier         TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_prefix  TEXT NOT NULL,           -- shown to the user (e.g. nmx_live_ab12)
    key_hash    TEXT NOT NULL,           -- bcrypt hash of the full key
    label       TEXT,
    revoked     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Per-request usage, stored as a TimescaleDB hypertable for time-series analytics.
CREATE TABLE IF NOT EXISTS usage_events (
    ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id   BIGINT NOT NULL,
    route     TEXT NOT NULL,
    method    TEXT NOT NULL,
    status    INT NOT NULL
);
SELECT create_hypertable('usage_events', 'ts', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_usage_user_ts ON usage_events(user_id, ts DESC);
