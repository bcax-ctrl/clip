"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { api, type Analysis } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

const ACTION_COLOR: Record<string, string> = {
  BUY: "text-bullish border-bullish/40",
  SELL: "text-bearish border-bearish/40",
  HOLD: "text-amber-400 border-amber-400/40",
  WATCH: "text-accent border-accent/40",
};

const AGENTS = [
  { name: "sentiment", label: "Sentiment" },
  { name: "technical", label: "Technical" },
  { name: "whale", label: "Whale" },
  { name: "macro", label: "Macro" },
  { name: "onchain", label: "On-Chain" },
];

export function AIAgent() {
  const { symbol } = useStore();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<"en" | "id">("en");

  const run = async () => {
    setBusy(true);
    setAnalysis(null);
    try {
      setAnalysis(await api.analyze(symbol));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const insight = analysis?.insight;

  return (
    <Card>
      <CardTitle right={<Button onClick={run} disabled={busy}>{busy ? "Analyzing…" : `Analyze ${symbol}`}</Button>}>
        AI Analysis Engine
      </CardTitle>

      {/* Agent row */}
      <div className="mb-4 grid grid-cols-5 gap-2">
        {AGENTS.map((a) => {
          const st = analysis?.agents.find((x) => x.name === a.name);
          const state = busy ? "running" : st?.status ?? "idle";
          return (
            <div key={a.name} className="rounded-lg border border-border p-2 text-center">
              <div
                className={clsx(
                  "mx-auto mb-1 h-2 w-2 rounded-full",
                  state === "running" && "animate-pulse bg-accent",
                  state === "ok" && "bg-bullish",
                  state === "error" && "bg-bearish",
                  state === "idle" && "bg-muted"
                )}
              />
              <div className="text-[10px] text-muted">{a.label}</div>
            </div>
          );
        })}
      </div>

      {!insight ? (
        <p className="py-6 text-center text-xs text-muted">Run an analysis to generate a signal.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className={clsx("rounded-lg border px-3 py-1 text-sm font-bold", ACTION_COLOR[insight.action])}>
              {insight.action}
            </span>
            <span className="text-xs text-muted">
              Risk <b className="text-white">{insight.risk_score}/10</b>
            </span>
            <span className="text-xs text-muted">
              Confidence <b className="text-white">{insight.confidence}%</b>
            </span>
            <div className="ml-auto flex gap-1">
              {(["en", "id"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={clsx(
                    "rounded-full border px-2 py-0.5 text-[10px]",
                    lang === l ? "border-accent text-accent" : "border-border text-muted"
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-zinc-200">
            {lang === "en" ? insight.summary_en : insight.summary_id}
          </p>
          <div className="space-y-1">
            {insight.key_signals.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted">
                <span className="mt-0.5 text-accent">▸</span>
                {s}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
