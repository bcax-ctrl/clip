"use client";

import { useEffect } from "react";
import { clsx } from "clsx";
import { useStore } from "@/lib/store";

const TICKER_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX"];

// Top-of-page live price strip. Connects to the AI service price WebSocket.
export function PriceTicker() {
  const { prices, connectPrices, wsConnected } = useStore();

  useEffect(() => {
    const disconnect = connectPrices(TICKER_SYMBOLS);
    return disconnect;
  }, [connectPrices]);

  const items = TICKER_SYMBOLS.map((s) => prices[s]).filter(Boolean);
  // Duplicate the list so the marquee loops seamlessly.
  const loop = items.length ? [...items, ...items] : [];

  return (
    <div className="panel mb-4 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={clsx("h-2 w-2 rounded-full", wsConnected ? "bg-bullish" : "bg-muted")} />
        <span className="text-[10px] uppercase tracking-widest text-muted">Live</span>
        <div className="relative flex-1 overflow-hidden">
          {loop.length ? (
            <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
              {loop.map((t, i) => (
                <span key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">{t.symbol}</span>
                  <span>${t.price >= 1 ? t.price.toFixed(2) : t.price.toPrecision(4)}</span>
                  <span className={t.change_24h >= 0 ? "text-bullish" : "text-bearish"}>
                    {t.change_24h >= 0 ? "+" : ""}
                    {t.change_24h.toFixed(2)}%
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted">Connecting to live price feed…</span>
          )}
        </div>
      </div>
    </div>
  );
}
