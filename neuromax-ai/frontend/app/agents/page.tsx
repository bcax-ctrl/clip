"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/card";

const DESCRIPTIONS: Record<string, string> = {
  sentiment: "Scrapes news + social sources and scores market mood on a -100 to +100 scale.",
  technical: "Computes RSI, MACD, Bollinger Bands and EMAs from live candles to derive bias.",
  whale: "Tracks large order flow and net buy/sell pressure from big players.",
  macro: "Monitors USD strength (DXY proxy) and risk-on / risk-off regime.",
  onchain: "Reads chain TVL and momentum as a proxy for on-chain health and activity.",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<{ name: string; label: string }[]>([]);

  useEffect(() => {
    api
      .getAgents()
      .then((d) => setAgents(d.agents))
      .catch(() =>
        setAgents([
          { name: "sentiment", label: "Sentiment Agent" },
          { name: "technical", label: "Technical Agent" },
          { name: "whale", label: "Whale Agent" },
          { name: "macro", label: "Macro Agent" },
          { name: "onchain", label: "On-Chain Agent" },
        ])
      );
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">AI Agent System</h1>
        <p className="mt-1 text-xs text-muted">
          Five specialists run in parallel and report to a Claude-powered MasterOrchestrator that
          synthesises a single, risk-scored, bilingual recommendation.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <Card key={a.name}>
            <CardTitle right={<span className="h-2 w-2 rounded-full bg-bullish" />}>{a.label}</CardTitle>
            <p className="text-xs leading-relaxed text-muted">
              {DESCRIPTIONS[a.name] ?? "Specialist analysis agent."}
            </p>
          </Card>
        ))}

        <Card className="border-accent/40">
          <CardTitle right={<span className="pill border-accent/40 text-accent">Claude</span>}>
            MasterOrchestrator
          </CardTitle>
          <p className="text-xs leading-relaxed text-muted">
            Collects every agent&apos;s findings, recalls relevant past analyses from long-term
            memory, and uses Claude (claude-sonnet-4-6) to produce the final BUY/SELL/HOLD/WATCH
            call with risk score, confidence and key signals.
          </p>
        </Card>
      </div>
    </div>
  );
}
