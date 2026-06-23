// Idempotent schema migration, run on gateway startup.
//
// On Railway (and any managed Postgres) there is no docker-entrypoint-initdb.d
// mount and no TimescaleDB extension, so the gateway provisions its own schema.
// TimescaleDB is best-effort: if the extension/hypertable isn't available we
// fall back to a plain table — usage tracking still works, just without the
// time-series optimisation.
import { pool } from "./db.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  tier          TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','enterprise')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_prefix  TEXT NOT NULL,
  key_hash    TEXT NOT NULL,
  label       TEXT,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

CREATE TABLE IF NOT EXISTS usage_events (
  ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id BIGINT NOT NULL,
  route   TEXT NOT NULL,
  method  TEXT NOT NULL,
  status  INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_user_ts ON usage_events(user_id, ts DESC);
`;

export async function migrate() {
  await pool.query(SCHEMA);
  // Best-effort TimescaleDB upgrade — silently skipped on plain Postgres.
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS timescaledb");
    await pool.query(
      "SELECT create_hypertable('usage_events','ts',if_not_exists => TRUE)"
    );
    console.log("[migrate] TimescaleDB hypertable ready");
  } catch (err) {
    console.log("[migrate] TimescaleDB unavailable, using plain table:", err.message);
  }
  console.log("[migrate] schema ready");
}
