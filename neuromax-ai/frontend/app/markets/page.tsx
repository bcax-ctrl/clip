"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { api, type Market } from "@/lib/api";
import { MarketCard } from "@/components/MarketCard";
import { Card, CardTitle } from "@/components/ui/card";

// Heatmap tile colour scaled by 24h change.
function heatColor(change: number) {
  if (change >= 5) return "bg-bullish/80";
  if (change >= 1) return "bg-bullish/40";
  if (change > -1) return "bg-border";
  if (change > -5) return "bg-bearish/40";
  return "bg-bearish/80";
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMarkets(40)
      .then(setMarkets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Market Explorer</h1>

      <Card>
        <CardTitle>Crypto Heatmap · 24h</CardTitle>
        {loading ? (
          <p className="text-xs text-muted">Loading heatmap…</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
            {markets.map((m) => (
              <div
                key={m.symbol}
                className={clsx("rounded-md p-2 text-center", heatColor(m.change_24h))}
                title={`${m.name}: ${m.change_24h.toFixed(2)}%`}
              >
                <div className="text-xs font-semibold">{m.symbol}</div>
                <div className="text-[10px]">{m.change_24h.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Top Markets</CardTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => (
            <MarketCard key={m.symbol} market={m} />
          ))}
        </div>
      </Card>
    </div>
  );
}
