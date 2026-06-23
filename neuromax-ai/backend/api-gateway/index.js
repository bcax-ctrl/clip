// NeuroMax API gateway — Express app fronting the FastAPI AI service.
// Responsibilities: JWT + API-key auth, tiered rate limiting, usage tracking.
import "dotenv/config";
import express from "express";
import cors from "cors";

import { pool } from "./db.js";
import { migrate } from "./migrate.js";
import { authenticate } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import authRoutes from "./routes/auth.js";
import marketRoutes from "./routes/markets.js";
import agentRoutes from "./routes/agents.js";

const app = express();
app.use(cors());
app.use(express.json());

// Usage tracking: log every authenticated API call to the TimescaleDB hypertable.
function trackUsage(req, res, next) {
  res.on("finish", () => {
    if (!req.user) return;
    pool
      .query(
        `INSERT INTO usage_events (user_id, route, method, status) VALUES ($1, $2, $3, $4)`,
        [req.user.id, req.path, req.method, res.statusCode]
      )
      .catch((err) => console.warn("[usage] insert failed:", err.message));
  });
  next();
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "api-gateway" }));

// Public auth endpoints (register/login). Key management inside is self-authed.
app.use("/api/auth", authRoutes);

// Everything below requires auth, is rate-limited by tier, and is metered.
app.use("/api/markets", authenticate, rateLimit, trackUsage, marketRoutes);
app.use("/api/agents", authenticate, rateLimit, trackUsage, agentRoutes);

// GET /api/usage — the caller's recent usage summary.
app.get("/api/usage", authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT date_trunc('hour', ts) AS hour, count(*) AS requests
       FROM usage_events WHERE user_id = $1 AND ts > now() - interval '24 hours'
       GROUP BY 1 ORDER BY 1`,
    [req.user.id]
  );
  res.json({ usage: rows });
});

app.use((err, _req, res, _next) => {
  console.error("unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;

// Ensure the schema exists before accepting traffic. Retry briefly so we don't
// crash-loop if the managed database is still coming up.
async function start() {
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await migrate();
      break;
    } catch (err) {
      console.warn(`[migrate] attempt ${attempt} failed: ${err.message}`);
      if (attempt === 10) console.error("[migrate] giving up; starting anyway");
      else await new Promise((r) => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, () => console.log(`[neuromax] API gateway listening on :${PORT}`));
}

start();
