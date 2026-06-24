// Typed client for the single NeuroMax Personal backend (FastAPI on :8000).
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

const TOKEN_KEY = "neuromax_personal_token";

function token(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = token();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export interface Insight {
  risk_score: number;
  confidence: number;
  action: "BUY" | "SELL" | "HOLD" | "WATCH";
  key_signals: string[];
  summary_en: string;
  summary_id: string;
}
export interface Analysis {
  symbol: string;
  insight: Insight;
  agents: { name: string; label: string; status: string; elapsed_ms: number }[];
  findings: Record<string, any>;
  elapsed_ms: number;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }).then((r) => {
      localStorage.setItem(TOKEN_KEY, r.token);
      return r;
    }),

  register: (email: string, password: string) =>
    req<{ token: string; user: any }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }).then((r) => {
      localStorage.setItem(TOKEN_KEY, r.token);
      return r;
    }),

  analyze: (symbol: string) =>
    req<Analysis>("/api/analyze", { method: "POST", body: JSON.stringify({ symbol }) }),

  portfolio: () => req<any>("/api/portfolio"),
  market: (symbol: string) => req<any>(`/api/markets/${symbol}`),
  signals: () => req<{ signals: any[] }>("/api/signals"),

  trade: (body: any) => req<any>("/api/trade", { method: "POST", body: JSON.stringify(body) }),

  positionSize: (body: any) =>
    req<any>("/api/risk/position-size", { method: "POST", body: JSON.stringify(body) }),

  backtest: (body: any) => req<any>("/api/backtest", { method: "POST", body: JSON.stringify(body) }),

  alerts: () => req<{ alerts: any[] }>("/api/alerts"),
  createAlert: (body: any) => req<any>("/api/alerts", { method: "POST", body: JSON.stringify(body) }),
  triggered: () => req<{ triggered: any[] }>("/api/alerts/triggered"),

  performance: () => req<any>("/api/performance"),
  contractStatus: () => req<any>("/api/contract/status"),
};
