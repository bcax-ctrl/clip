"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { useStore } from "@/lib/store";
import { PriceTicker } from "@/components/PriceTicker";
import { AIAgent } from "@/components/AIAgent";
import { ChartRenderer } from "@/components/ChartRenderer";
import { PortfolioWidget } from "@/components/PortfolioWidget";
import { TradePanel } from "@/components/TradePanel";
import { AlertManager } from "@/components/AlertManager";
import { Backtest } from "@/components/Backtest";

const TABS = ["Analysis", "Portfolio", "Trade", "Charts", "Alerts", "Backtest"] as const;
type Tab = (typeof TABS)[number];

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX"];

export default function Dashboard() {
  const { symbol, setSymbol } = useStore();
  const [tab, setTab] = useState<Tab>("Analysis");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-base/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent" />
          <span className="text-sm font-bold tracking-widest">NEUROMAX&nbsp;PERSONAL</span>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="ml-auto rounded-lg border border-border bg-panel px-2 py-1 text-sm"
          >
            {SYMBOLS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <PriceTicker />
        {/* Tabs */}
        <nav className="flex gap-1 overflow-x-auto px-4 py-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium",
                tab === t ? "bg-accent text-white" : "text-muted hover:text-white"
              )}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] p-4">
        {tab === "Analysis" && (
          <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              <ChartRenderer />
              <AIAgent />
            </div>
            <div className="space-y-3">
              <PortfolioWidget />
              <TradePanel />
            </div>
          </div>
        )}
        {tab === "Portfolio" && (
          <div className="grid gap-3 lg:grid-cols-2">
            <PortfolioWidget />
            <TradePanel />
          </div>
        )}
        {tab === "Trade" && (
          <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
            <ChartRenderer />
            <TradePanel />
          </div>
        )}
        {tab === "Charts" && <ChartRenderer />}
        {tab === "Alerts" && <AlertManager />}
        {tab === "Backtest" && <Backtest />}
      </main>
    </div>
  );
}
