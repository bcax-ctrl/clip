// Market data routes — thin authenticated proxy to the FastAPI AI service.
import { Router } from "express";
import axios from "axios";

const router = Router();
const AI = process.env.AI_SERVICE_URL || "http://ai-service:8000";

async function proxy(res, method, path, data) {
  try {
    const resp = await axios({ method, url: `${AI}${path}`, data, timeout: 30000 });
    return res.status(resp.status).json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    return res.status(status).json({ error: "AI service error", detail: err.response?.data || err.message });
  }
}

// GET /api/markets?limit=20
router.get("/", (req, res) => proxy(res, "get", `/api/v1/markets?limit=${req.query.limit || 20}`));

// GET /api/markets/:symbol
router.get("/:symbol", (req, res) => proxy(res, "get", `/api/v1/markets/${encodeURIComponent(req.params.symbol)}`));

// GET /api/markets/:symbol/sentiment
router.get("/:symbol/sentiment", (req, res) =>
  proxy(res, "get", `/api/v1/sentiment/${encodeURIComponent(req.params.symbol)}`)
);

// GET /api/whales?symbol=BTC
router.get("/whales/feed", (req, res) =>
  proxy(res, "get", `/api/v1/whales?symbol=${encodeURIComponent(req.query.symbol || "BTC")}`)
);

export default router;
