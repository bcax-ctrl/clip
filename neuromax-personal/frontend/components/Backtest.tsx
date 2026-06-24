"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

const STRATEGIES = ["sma_cross", "rsi", "macd"];

export function Backtest() {
  const { symbol } = useStore();
  const [strategy, setStrategy] = useState("sma_cross");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);

  const run = async () => {
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      setResult(await api.backtest({ symbol, strategy, days: 365, interval: "1d" }));
    } catch (e: any) {
      setErr(e.message?.slice(0, 140) || "Failed");
    } finally {
      setBusy(false);
    }
  };

  // Render the equity curve when results arrive.
  useEffect(() => {
    if (!result?.equity_curve || !chartRef.current) return;
    const chart: IChartApi = createChart(chartRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#111114" }, textColor: "#71717a" },
      grid: { vertLines: { color: "#1f1f24" }, horzLines: { color: "#1f1f24" } },
      width: chartRef.current.clientWidth,
      height: 220,
      timeScale: { borderColor: "#1f1f24", timeVisible: true },
    });
    const line = chart.addAreaSeries({ lineColor: "#6366f1", topColor: "rgba(99,102,241,0.4)", bottomColor: "rgba(99,102,241,0)" });
    line.setData(result.equity_curve.map((p: any) => ({ time: p.time as UTCTimestamp, value: p.equity })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [result]);

  const metric = (label: string, value: any, cls = "") => (
    <div className="rounded-lg border border-border p-2 text-center">
      <div className={`text-sm font-semibold ${cls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );

  return (
    <Card>
      <CardTitle
        right={
          <div className="flex items-center gap-2">
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="rounded border border-border bg-base px-2 py-1 text-xs"
            >
              {STRATEGIES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Button onClick={run} disabled={busy}>{busy ? "…" : "Run"}</Button>
          </div>
        }
      >
        Backtest · {symbol} · 1y daily
      </CardTitle>

      {err && <p className="text-xs text-bearish">{err}</p>}
      {!result && !err && <p className="py-6 text-center text-xs text-muted">Pick a strategy and run a backtest.</p>}

      {result && !result.error && (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {metric("Return", `${result.total_return_pct}%`, result.total_return_pct >= 0 ? "text-bullish" : "text-bearish")}
            {metric("Buy&Hold", `${result.buy_hold_return_pct}%`)}
            {metric("Win rate", `${result.win_rate_pct}%`)}
            {metric("Sharpe", result.sharpe_ratio)}
            {metric("Max DD", `${result.max_drawdown_pct}%`, "text-bearish")}
            {metric("Trades", result.trades)}
          </div>
          <div ref={chartRef} className="w-full" />
        </>
      )}
      {result?.error && <p className="text-xs text-bearish">{result.error}</p>}
    </Card>
  );
}
