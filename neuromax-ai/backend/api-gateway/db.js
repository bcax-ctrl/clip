// Shared Postgres pool and Redis client for the gateway.
import pg from "pg";
import Redis from "ioredis";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neuromax:neuromax@postgres:5432/neuromax",
});

export const redis = new Redis(process.env.REDIS_URL || "redis://redis:6379", {
  // Don't crash the process if Redis is briefly unavailable; rate limiting
  // fails open (see middleware/rateLimit.js).
  maxRetriesPerRequest: 2,
  lazyConnect: false,
});

redis.on("error", (err) => console.warn("[redis] error:", err.message));
