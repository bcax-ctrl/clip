"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import { Card, CardTitle } from "./ui/card";

interface WhaleTrade {
  side: "buy" | "sell";
  notional_usd: number;
  price: number;
  qty: number;
  time: number;
}

export function WhaleTracker({ symbol }: { symbol: string }) {
  const [trades, setTrades] = useState<WhaleTrade[]>([]);
  const [pressure, setPressure] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await api.getWhales(symbol);
        if (!alive) return;
        setTrades(data.whale_trades || []);
        setPressure(data.net_pressure || 0);
      } catch {
        /* keep last data on error */
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 15000); // live-ish feed
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol]);

  return (
    <Card className="flex h-full flex-col">
      <CardTitle
        right={
          <span className={clsx("text-xs", pressure >= 0 ? "text-bullish" : "text-bearish")}>
            net {(pressure * 100).toFixed(0)}%
          </span>
        }
      >
        Whale Activity · {symbol}
      </CardTitle>
      {loading && trades.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted">Scanning order flow…</div>
      ) : trades.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted">No whale-sized trades right now.</div>
      ) : (
        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {trades.map((t, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className={clsx("font-semibold uppercase", t.side === "buy" ? "text-bullish" : "text-bearish")}>
                {t.side}
              </span>
              <span className="text-muted">${t.price.toLocaleString()}</span>
              <span className="font-medium">${(t.notional_usd / 1000).toFixed(0)}k</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
