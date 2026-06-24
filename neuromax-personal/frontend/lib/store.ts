// Global client state: selected symbol + live price stream.
import { create } from "zustand";
import { WS_URL } from "./api";

export interface PriceTick {
  symbol: string;
  price: number;
  change_24h: number;
}

interface AppState {
  symbol: string;
  prices: Record<string, PriceTick>;
  wsConnected: boolean;
  setSymbol: (s: string) => void;
  setPrices: (ticks: PriceTick[]) => void;
  connectPrices: (symbols: string[]) => () => void;
}

export const useStore = create<AppState>((set, get) => ({
  symbol: "BTC",
  prices: {},
  wsConnected: false,
  setSymbol: (symbol) => set({ symbol: symbol.toUpperCase() }),
  setPrices: (ticks) =>
    set((state) => {
      const next = { ...state.prices };
      for (const t of ticks) {
        const base = t.symbol.replace(/(USDT|USDC|BUSD)$/i, "");
        next[base] = { ...t, symbol: base };
      }
      return { prices: next };
    }),
  connectPrices: (symbols) => {
    if (typeof window === "undefined") return () => {};
    let ws: WebSocket;
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;
    const open = () => {
      ws = new WebSocket(`${WS_URL}/ws/prices`);
      ws.onopen = () => {
        set({ wsConnected: true });
        ws.send(JSON.stringify({ symbols }));
      };
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          if (m.type === "prices") get().setPrices(m.data);
        } catch {}
      };
      ws.onclose = () => {
        set({ wsConnected: false });
        if (!closed) retry = setTimeout(open, 3000);
      };
      ws.onerror = () => ws.close();
    };
    open();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    };
  },
}));
