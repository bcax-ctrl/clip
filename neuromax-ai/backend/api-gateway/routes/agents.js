// Agent / analysis routes — authenticated proxy to the FastAPI AI service.
import { Router } from "express";
import axios from "axios";

const router = Router();
const AI = process.env.AI_SERVICE_URL || "http://ai-service:8000";

async function proxy(res, method, path, data) {
  try {
    const resp = await axios({ method, url: `${AI}${path}`, data, timeout: 120000 });
    return res.status(resp.status).json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    return res.status(status).json({ error: "AI service error", detail: err.response?.data || err.message });
  }
}

// GET /api/agents — roster + labels
router.get("/", (req, res) => proxy(res, "get", "/api/v1/agents"));

// POST /api/agents/analyze — full multi-agent analysis
router.post("/analyze", (req, res) =>
  proxy(res, "post", "/api/v1/analyze", { ...req.body, user_id: String(req.user.id) })
);

// GET /api/agents/signals?symbols=BTC,ETH
router.get("/signals", (req, res) =>
  proxy(res, "get", `/api/v1/signals?symbols=${encodeURIComponent(req.query.symbols || "BTC,ETH,SOL")}`)
);

// POST /api/agents/portfolio
router.post("/portfolio", (req, res) =>
  proxy(res, "post", "/api/v1/portfolio", { ...req.body, user_id: String(req.user.id) })
);

// POST /api/agents/chat — stream SSE straight through to the client.
router.post("/chat", async (req, res) => {
  const AI_URL = `${AI}/api/v1/chat`;
  try {
    const upstream = await axios({
      method: "post",
      url: AI_URL,
      data: req.body,
      responseType: "stream",
      timeout: 120000,
    });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    upstream.data.pipe(res);
    upstream.data.on("error", () => res.end());
  } catch (err) {
    res.status(502).json({ error: "Chat stream failed", detail: err.message });
  }
});

export default router;
