"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Leaderboard is representative demo data (no social backend ships in this MVP);
// the community-signals panel below is powered by the live signals endpoint.
const LEADERBOARD = [
  { rank: 1, trader: "0xWhaleHunter", roi: 312.4, followers: 18420, win: 71 },
  { rank: 2, trader: "AlphaSeeker_ID", roi: 244.1, followers: 12030, win: 68 },
  { rank: 3, trader: "QuantNomad", roi: 198.7, followers: 9870, win: 64 },
  { rank: 4, trader: "DeltaNeutral", roi: 156.2, followers: 7340, win: 62 },
  { rank: 5, trader: "MacroMaxi", roi: 121.9, followers: 5210, win: 59 },
];

interface Signal {
  symbol: string;
  bias: string;
  rsi: number;
  macd_histogram: number;
}

export default function SocialPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api
      .getSignals(["BTC", "ETH", "SOL", "BNB", "XRP", "AVAX", "ADA", "DOGE"])
      .then((d) => setSignals(d.signals))
      .catch(() => {});
  }, []);

  const biasColor = (b: string) =>
    b === "bullish" || b === "oversold" ? "text-bullish" : b === "bearish" || b === "overbought" ? "text-bearish" : "text-muted";

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardTitle right={<span className="pill text-muted">demo data</span>}>Copy-Trading Leaderboard</CardTitle>
        <div className="space-y-2">
          {LEADERBOARD.map((t) => (
            <div key={t.rank} className="flex items-center gap-3 rounded-lg border border-border p-2">
              <span className="w-5 text-center text-sm font-bold text-accent">{t.rank}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold">{t.trader}</div>
                <div className="text-[11px] text-muted">
                  {t.followers.toLocaleString()} followers · {t.win}% win rate
                </div>
              </div>
              <span className="text-sm font-medium text-bullish">+{t.roi}%</span>
              <Button
                variant={following[t.trader] ? "ghost" : "primary"}
                onClick={() => setFollowing((f) => ({ ...f, [t.trader]: !f[t.trader] }))}
              >
                {following[t.trader] ? "Following" : "Copy"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle right={<span className="pill border-accent/40 text-accent">live</span>}>
          Community Signals
        </CardTitle>
        <p className="mb-3 text-xs text-muted">
          Live technical signals shared across the NeuroMax network.
        </p>
        <div className="space-y-2">
          {signals.length === 0 && <p className="text-xs text-muted">Loading signals…</p>}
          {signals.map((s) => (
            <div key={s.symbol} className="flex items-center justify-between rounded-lg border border-border p-2 text-xs">
              <span className="font-semibold">{s.symbol}</span>
              <span className={clsx("uppercase", biasColor(s.bias))}>{s.bias}</span>
              <span className="text-muted">RSI {s.rsi.toFixed(0)}</span>
              <span className={s.macd_histogram >= 0 ? "text-bullish" : "text-bearish"}>
                MACD {s.macd_histogram >= 0 ? "+" : ""}
                {s.macd_histogram.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
