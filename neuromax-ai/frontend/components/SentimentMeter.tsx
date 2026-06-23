"use client";

import { Card, CardTitle } from "./ui/card";

// Renders a -100..+100 sentiment gauge as a horizontal bar with a marker.
export function SentimentMeter({ score, label }: { score: number; label?: string }) {
  const clamped = Math.max(-100, Math.min(100, score));
  const pct = (clamped + 100) / 2; // map -100..100 -> 0..100
  const color = clamped > 15 ? "text-bullish" : clamped < -15 ? "text-bearish" : "text-muted";

  return (
    <Card>
      <CardTitle right={<span className={`text-sm font-bold ${color}`}>{clamped > 0 ? "+" : ""}{clamped}</span>}>
        Sentiment Meter
      </CardTitle>
      <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-bearish via-muted/40 to-bullish">
        <div
          className="absolute top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-full bg-white shadow"
          style={{ left: `calc(${pct}% - 3px)` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-muted">
        <span>Bearish</span>
        <span className={color}>{label ?? "neutral"}</span>
        <span>Bullish</span>
      </div>
    </Card>
  );
}
