"use client";

import { useEffect } from "react";
import { clsx } from "clsx";
import { useStore } from "@/lib/store";

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX"];

export function PriceTicker() {
  const { prices, connectPrices, wsConnected, setSymbol } = useStore();
  useEffect(() => connectPrices(SYMBOLS), [connectPrices]);
  const items = SYMBOLS.map((s) => prices[s]).filter(Boolean);

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-base px-3 py-2">
      <span className={clsx("h-2 w-2 shrink-0 rounded-full", wsConnected ? "bg-bullish" : "bg-muted")} />
      {items.length === 0 ? (
        <span className="text-xs text-muted">Connecting live feed…</span>
      ) : (
        items.map((t) => (
          <button
            key={t.symbol}
            onClick={() => setSymbol(t.symbol)}
            className="flex shrink-0 items-center gap-1.5 text-xs hover:opacity-80"
          >
            <span className="font-semibold">{t.symbol}</span>
            <span>${t.price >= 1 ? t.price.toFixed(2) : t.price.toPrecision(4)}</span>
            <span className={t.change_24h >= 0 ? "text-bullish" : "text-bearish"}>
              {t.change_24h >= 0 ? "+" : ""}
              {t.change_24h.toFixed(2)}%
            </span>
          </button>
        ))
      )}
    </div>
  );
}
