"use client";

import { useEffect, useState } from "react";
import { api, type Market } from "@/lib/api";
import { useStore } from "@/lib/store";
import { PriceTicker } from "@/components/PriceTicker";
import { PriceChart } from "@/components/charts/PriceChart";
import { ChatInterface } from "@/components/ChatInterface";
import { AgentPanel } from "@/components/AgentPanel";
import { WhaleTracker } from "@/components/WhaleTracker";
import { SentimentMeter } from "@/components/SentimentMeter";
import { InsightCard } from "@/components/InsightCard";
import { MarketCard } from "@/components/MarketCard";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { symbol, setSymbol, analysis, setAnalysis, analyzing, setAnalyzing } = useStore();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [sentiment, setSentiment] = useState<{ score: number; label: string } | null>(null);

  useEffect(() => {
    api.getMarkets(12).then(setMarkets).catch(() => {});
  }, []);

  useEffect(() => {
    setSentiment(null);
    api
      .getSentiment(symbol)
      .then((s) => setSentiment({ score: s.score ?? 0, label: s.label ?? "neutral" }))
      .catch(() => setSentiment({ score: 0, label: "neutral" }));
  }, [symbol]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await api.analyze(symbol);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      <PriceTicker />

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">{symbol} Terminal</h1>
          <span className="text-xs text-muted">multi-asset · real-time</span>
        </div>
        <Button onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? "Analyzing…" : "Run AI Analysis"}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-3">
          <PriceChart symbol={symbol} />
          <InsightCard insight={analysis?.insight ?? null} elapsedMs={analysis?.elapsed_ms} />
          <ChatInterface symbol={symbol} />
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <AgentPanel agents={analysis?.agents ?? []} running={analyzing} />
          {sentiment && <SentimentMeter score={sentiment.score} label={sentiment.label} />}
          <WhaleTracker symbol={symbol} />
          <Card>
            <CardTitle>Watchlist</CardTitle>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {markets.length === 0 && <p className="text-xs text-muted">Loading markets…</p>}
              {markets.map((m) => (
                <MarketCard key={m.symbol} market={m} onClick={() => setSymbol(m.symbol)} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
