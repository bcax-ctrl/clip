"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

// Position sizing + risk-managed trade plan. Execution is gated server-side by
// AUTO_TRADE_ENABLED; here we request a *plan* (and optionally a prepared tx).
export function TradePanel() {
  const { symbol } = useStore();
  const [action, setAction] = useState<"BUY" | "SELL">("BUY");
  const [entry, setEntry] = useState("");
  const [balance, setBalance] = useState("10000");
  const [risk, setRisk] = useState("1");
  const [stop, setStop] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    setPlan(null);
    try {
      const res = await api.trade({
        symbol,
        action,
        entry_price: parseFloat(entry),
        account_balance: parseFloat(balance),
        risk_pct: parseFloat(risk),
        stop_loss: stop ? parseFloat(stop) : undefined,
        execute: false,
      });
      setPlan(res.plan);
    } catch (e: any) {
      setErr(e.message?.slice(0, 140) || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, value: string, set: (v: string) => void, ph = "") => (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={ph}
        inputMode="decimal"
        className="w-full rounded-lg border border-border bg-base px-2 py-1.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );

  return (
    <Card>
      <CardTitle>Trade · {symbol}</CardTitle>
      <div className="mb-2 flex gap-2">
        {(["BUY", "SELL"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${
              action === a ? (a === "BUY" ? "bg-bullish text-white" : "bg-bearish text-white") : "border border-border text-muted"
            }`}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {field("Entry price", entry, setEntry, "0.00")}
        {field("Account $", balance, setBalance)}
        {field("Risk %", risk, setRisk)}
        {field("Stop loss (opt)", stop, setStop, "auto")}
      </div>
      {err && <p className="mt-2 text-xs text-bearish">{err}</p>}
      <Button onClick={submit} disabled={busy || !entry} className="mt-3 w-full">
        {busy ? "…" : "Calculate plan"}
      </Button>

      {plan && (
        <div className="mt-3 space-y-1 rounded-lg border border-border p-3 text-xs">
          <Row label="Position size" value={`$${plan.position_size_usd.toLocaleString()}`} />
          <Row label="Quantity" value={plan.quantity} />
          <Row label="Risk" value={`$${plan.risk_usd}`} />
          <Row label="R:R" value={`${plan.risk_reward_ratio}:1`} />
          <Row label="Stop / Target" value={`${plan.stop_loss} / ${plan.take_profit}`} />
          <Row label="Max slippage" value={`${plan.max_slippage_pct}%`} />
          <Row
            label="Auto-execute"
            value={plan.auto_trade_enabled ? "ENABLED" : "off (safe)"}
            valueClass={plan.auto_trade_enabled ? "text-amber-400" : "text-muted"}
          />
        </div>
      )}
    </Card>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: any; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
