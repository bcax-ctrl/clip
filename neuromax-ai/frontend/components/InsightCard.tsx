"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { Insight } from "@/lib/api";
import { Card, CardTitle } from "./ui/card";

const ACTION_COLOR: Record<string, string> = {
  BUY: "text-bullish border-bullish/40",
  SELL: "text-bearish border-bearish/40",
  HOLD: "text-amber-400 border-amber-400/40",
  WATCH: "text-accent border-accent/40",
};

export function InsightCard({ insight, elapsedMs }: { insight: Insight | null; elapsedMs?: number }) {
  const [lang, setLang] = useState<"en" | "id">("en");

  if (!insight) {
    return (
      <Card>
        <CardTitle>AI Synthesis</CardTitle>
        <p className="py-6 text-center text-xs text-muted">
          Run an analysis to get a risk-scored recommendation.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle
        right={
          <div className="flex items-center gap-1">
            {(["en", "id"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={clsx("pill", lang === l ? "border-accent text-accent" : "text-muted")}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        }
      >
        AI Synthesis {elapsedMs ? `· ${(elapsedMs / 1000).toFixed(1)}s` : ""}
      </CardTitle>

      <div className="mb-3 flex items-center gap-3">
        <span className={clsx("rounded-lg border px-3 py-1 text-sm font-bold", ACTION_COLOR[insight.action])}>
          {insight.action}
        </span>
        <div className="text-xs text-muted">
          Risk <span className="font-semibold text-white">{insight.risk_score}/10</span>
        </div>
        <div className="text-xs text-muted">
          Confidence <span className="font-semibold text-white">{insight.confidence}%</span>
        </div>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-zinc-200">
        {lang === "en" ? insight.summary_en : insight.summary_id}
      </p>

      <div className="space-y-1">
        {insight.key_signals.map((s, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-muted">
            <span className="mt-0.5 text-accent">▸</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
