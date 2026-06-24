"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { useStore } from "@/lib/store";
import { Card, CardTitle } from "./ui/card";

const TIMEFRAMES = ["15m", "1h", "4h", "1d"];

// TradingView Lightweight Charts: candles + EMA20/EMA50 overlays from live
// Binance klines. Multi-timeframe via the selector.
export function ChartRenderer() {
  const { symbol } = useStore();
  const [tf, setTf] = useState("1h");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart: IChartApi = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#111114" }, textColor: "#71717a" },
      grid: { vertLines: { color: "#1f1f24" }, horzLines: { color: "#1f1f24" } },
      width: containerRef.current.clientWidth,
      height: 380,
      timeScale: { borderColor: "#1f1f24", timeVisible: true },
      rightPriceScale: { borderColor: "#1f1f24" },
    });
    const candles = chart.addCandlestickSeries({
      upColor: "#16c784", downColor: "#ea3943", borderVisible: false,
      wickUpColor: "#16c784", wickDownColor: "#ea3943",
    });
    const ema20 = chart.addLineSeries({ color: "#6366f1", lineWidth: 1 });
    const ema50 = chart.addLineSeries({ color: "#f59e0b", lineWidth: 1 });

    const bsym = `${symbol.toUpperCase().replace(/(USDT|USDC|BUSD)$/i, "")}USDT`;
    let alive = true;

    const ema = (vals: number[], period: number) => {
      const k = 2 / (period + 1);
      const out: number[] = [];
      vals.forEach((v, i) => (out[i] = i === 0 ? v : v * k + out[i - 1] * (1 - k)));
      return out;
    };

    fetch(`https://api.binance.com/api/v3/klines?symbol=${bsym}&interval=${tf}&limit=300`)
      .then((r) => r.json())
      .then((rows: any[]) => {
        if (!alive || !Array.isArray(rows)) return;
        const closes = rows.map((r) => +r[4]);
        const e20 = ema(closes, 20);
        const e50 = ema(closes, 50);
        candles.setData(
          rows.map((r) => ({
            time: Math.floor(r[0] / 1000) as UTCTimestamp,
            open: +r[1], high: +r[2], low: +r[3], close: +r[4],
          }))
        );
        const t = (i: number) => (Math.floor(rows[i][0] / 1000) as UTCTimestamp);
        ema20.setData(e20.map((v, i) => ({ time: t(i), value: v })));
        ema50.setData(e50.map((v, i) => ({ time: t(i), value: v })));
        chart.timeScale().fitContent();
      })
      .catch(() => {});

    const onResize = () => containerRef.current && chart.applyOptions({ width: containerRef.current.clientWidth });
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [symbol, tf]);

  return (
    <Card>
      <CardTitle
        right={
          <div className="flex gap-1">
            {TIMEFRAMES.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`rounded px-2 py-0.5 text-[10px] ${tf === t ? "bg-accent text-white" : "border border-border text-muted"}`}
              >
                {t}
              </button>
            ))}
          </div>
        }
      >
        {symbol}/USDT · EMA20 (indigo) / EMA50 (amber)
      </CardTitle>
      <div ref={containerRef} className="w-full" />
    </Card>
  );
}
