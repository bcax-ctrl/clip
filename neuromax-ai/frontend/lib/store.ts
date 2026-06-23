// Global client state (Zustand): selected symbol, live prices, latest analysis.
import { create } from "zustand";
import { WS_URL, type Analysis } from "./api";

export interface PriceTick {
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h?: number;
}

interface AppState {
  symbol: string;
  prices: Record<string, PriceTick>;
  analysis: Analysis | null;
  analyzing: boolean;
  wsConnected: boolean;

  setSymbol: (symbol: string) => void;
  setPrices: (ticks: PriceTick[]) => void;
  setAnalysis: (a: Analysis | null) => void;
  setAnalyzing: (v: boolean) => void;
  connectPrices: (symbols: string[]) => () => void;
}

export const useStore = create<AppState>((set, get) => ({
  symbol: "BTC",
  prices: {},
  analysis: null,
  analyzing: false,
  wsConnected: false,

  setSymbol: (symbol) => set({ symbol: symbol.toUpperCase() }),

  setPrices: (ticks) =>
    set((state) => {
      const next = { ...state.prices };
      for (const t of ticks) {
        // The WS reports Binance symbols like BTCUSDT; normalise to base ticker.
        const base = t.symbol.replace(/(USDT|USDC|BUSD)$/i, "");
        next[base] = { ...t, symbol: base };
      }
      return { prices: next };
    }),

  setAnalysis: (analysis) => set({ analysis }),
  setAnalyzing: (analyzing) => set({ analyzing }),

  // Opens a WebSocket to the AI service price stream. Returns a disconnect fn.
  connectPrices: (symbols) => {
    if (typeof window === "undefined") return () => {};
    let ws: WebSocket;
    let closedByUser = false;
    let retry: ReturnType<typeof setTimeout>;

    const open = () => {
      ws = new WebSocket(`${WS_URL}/ws/prices`);
      ws.onopen = () => {
        set({ wsConnected: true });
        ws.send(JSON.stringify({ symbols }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "prices") get().setPrices(msg.data);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        set({ wsConnected: false });
        if (!closedByUser) retry = setTimeout(open, 3000); // auto-reconnect
      };
      ws.onerror = () => ws.close();
    };

    open();
    return () => {
      closedByUser = true;
      clearTimeout(retry);
      ws?.close();
    };
  },
}));
