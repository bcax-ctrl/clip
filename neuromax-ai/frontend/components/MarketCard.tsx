"use client";

import { clsx } from "clsx";
import type { Market } from "@/lib/api";

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toPrecision(4);
}

function fmtCap(c: number | null) {
  if (!c) return "—";
  if (c >= 1e12) return `$${(c / 1e12).toFixed(2)}T`;
  if (c >= 1e9) return `$${(c / 1e9).toFixed(2)}B`;
  if (c >= 1e6) return `$${(c / 1e6).toFixed(1)}M`;
  return `$${c}`;
}

export function MarketCard({ market, onClick }: { market: Market; onClick?: () => void }) {
  const up = market.change_24h >= 0;
  return (
    <button
      onClick={onClick}
      className="panel flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-accent/50"
    >
      {market.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={market.image} alt={market.symbol} className="h-7 w-7 rounded-full" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-border text-[10px]">
          {market.symbol.slice(0, 3)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{market.symbol}</span>
          <span className="truncate text-[11px] text-muted">{market.name}</span>
        </div>
        <div className="text-xs text-muted">{fmtCap(market.market_cap)}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">${fmtPrice(market.price)}</div>
        <div className={clsx("text-xs", up ? "text-bullish" : "text-bearish")}>
          {up ? "▲" : "▼"} {Math.abs(market.change_24h).toFixed(2)}%
        </div>
      </div>
    </button>
  );
}
