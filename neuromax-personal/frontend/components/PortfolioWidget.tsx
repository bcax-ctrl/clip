"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import { Card, CardTitle } from "./ui/card";

export function PortfolioWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .portfolio()
        .then((d) => alive && setData(d))
        .catch(() => {})
        .finally(() => alive && setLoading(false));
    load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (loading) return <Card><CardTitle>Portfolio</CardTitle><p className="text-xs text-muted">Loading…</p></Card>;

  if (!data?.connected || !data?.holdings?.length) {
    return (
      <Card>
        <CardTitle>Portfolio</CardTitle>
        <p className="py-4 text-center text-xs text-muted">
          {data?.note || "Connect a read-only Binance API key in settings to sync holdings."}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle right={<span className="text-sm font-bold">${data.total_value_usd.toLocaleString()}</span>}>
        Portfolio
      </CardTitle>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Positions" value={data.position_count} />
        <Stat label="Diversification" value={`${data.diversification_score ?? "—"}`} />
        <Stat label="Heat" value={`${data.heat?.heat_pct ?? 0}%`} />
      </div>
      <div className="space-y-1">
        {data.holdings.map((h: any) => (
          <div key={h.symbol} className="flex items-center justify-between rounded-lg border border-border p-2 text-xs">
            <span className="font-semibold">{h.symbol}</span>
            <span className="text-muted">{h.weight_pct}%</span>
            <span>${h.value_usd.toLocaleString()}</span>
            <span className={clsx(h.change_24h >= 0 ? "text-bullish" : "text-bearish", "w-16 text-right")}>
              {h.change_24h >= 0 ? "+" : ""}
              {h.change_24h.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}
