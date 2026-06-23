"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { Card, CardTitle } from "../ui/card";

// TradingView Lightweight Charts candlestick view. Pulls candles directly from
// the public Binance klines endpoint (no key required) so the chart is live.
export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#111114" },
        textColor: "#71717a",
      },
      grid: {
        vertLines: { color: "#1f1f24" },
        horzLines: { color: "#1f1f24" },
      },
      width: containerRef.current.clientWidth,
      height: 360,
      timeScale: { borderColor: "#1f1f24", timeVisible: true },
      rightPriceScale: { borderColor: "#1f1f24" },
    });
    chartRef.current = chart;

    const series = chart.addCandlestickSeries({
      upColor: "#16c784",
      downColor: "#ea3943",
      borderVisible: false,
      wickUpColor: "#16c784",
      wickDownColor: "#ea3943",
    });

    const bsym = `${symbol.toUpperCase().replace(/(USDT|USDC|BUSD)$/i, "")}USDT`;
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${bsym}&interval=1h&limit=200`
        );
        const rows = await res.json();
        if (!alive || !Array.isArray(rows)) return;
        series.setData(
          rows.map((r: any[]) => ({
            time: Math.floor(r[0] / 1000) as UTCTimestamp,
            open: +r[1],
            high: +r[2],
            low: +r[3],
            close: +r[4],
          }))
        );
        chart.timeScale().fitContent();
      } catch {
        /* chart simply stays empty on network error */
      }
    };
    load();

    const onResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [symbol]);

  return (
    <Card>
      <CardTitle right={<span className="text-xs text-muted">1H · Binance</span>}>
        {symbol} / USDT
      </CardTitle>
      <div ref={containerRef} className="w-full" />
    </Card>
  );
}
