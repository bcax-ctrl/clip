// Typed client for the NeuroMax API gateway.
//
// The gateway requires auth on data routes, so on first use we transparently
// provision a demo account (register, or log in if it already exists) and cache
// the JWT in localStorage. This lets the dashboard work out-of-the-box while
// keeping the gateway's auth/rate-limit/usage pipeline fully intact.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface Insight {
  risk_score: number;
  confidence: number;
  action: "BUY" | "SELL" | "HOLD" | "WATCH";
  key_signals: string[];
  summary_en: string;
  summary_id: string;
}

export interface AgentStatus {
  name: string;
  label: string;
  status: "ok" | "error";
  elapsed_ms: number;
  error: string | null;
}

export interface Analysis {
  symbol: string;
  insight: Insight;
  agents: AgentStatus[];
  findings: Record<string, any>;
  elapsed_ms: number;
}

export interface Market {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  market_cap: number | null;
  image?: string;
  asset_class: string;
}

const TOKEN_KEY = "neuromax_token";
const EMAIL_KEY = "neuromax_demo_email";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function ensureAuth(): Promise<string> {
  const existing = getToken();
  if (existing) return existing;

  // Stable demo identity per browser.
  let email = localStorage.getItem(EMAIL_KEY);
  if (!email) {
    email = `demo_${Math.random().toString(36).slice(2, 10)}@neuromax.ai`;
    localStorage.setItem(EMAIL_KEY, email);
  }
  const password = "demo-password-123";

  const tryAuth = async (path: string) => {
    const res = await fetch(`${API_URL}/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res;
  };

  let res = await tryAuth("register");
  if (res.status === 409) res = await tryAuth("login");
  if (!res.ok) throw new Error(`Auth failed (${res.status})`);

  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await ensureAuth();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} -> ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMarkets: (limit = 20) =>
    request<{ markets: Market[] }>(`/api/markets?limit=${limit}`).then((d) => d.markets),

  getMarket: (symbol: string) => request<Market>(`/api/markets/${symbol}`),

  getSentiment: (symbol: string) =>
    request<{ symbol: string; score: number; label: string; headlines: any[] }>(
      `/api/markets/${symbol}/sentiment`
    ),

  getWhales: (symbol: string) =>
    request<any>(`/api/markets/whales/feed?symbol=${symbol}`),

  getAgents: () => request<{ agents: { name: string; label: string }[] }>(`/api/agents`),

  analyze: (symbol: string) =>
    request<Analysis>(`/api/agents/analyze`, {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),

  getSignals: (symbols: string[]) =>
    request<{ signals: any[] }>(`/api/agents/signals?symbols=${symbols.join(",")}`),

  analyzePortfolio: (holdings: { symbol: string; amount: number }[]) =>
    request<any>(`/api/agents/portfolio`, {
      method: "POST",
      body: JSON.stringify({ holdings }),
    }),

  // Streaming chat — yields incremental text chunks via the SSE proxy.
  chat: async function* (message: string, symbol?: string): AsyncGenerator<string> {
    const token = await ensureAuth();
    const res = await fetch(`${API_URL}/api/agents/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, symbol }),
    });
    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const payload = line.replace(/^data:\s*/, "").trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.text) yield parsed.text;
        } catch {
          /* ignore keep-alive / partial frames */
        }
      }
    }
  },
};

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
