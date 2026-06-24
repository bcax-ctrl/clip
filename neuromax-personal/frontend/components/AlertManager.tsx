"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

// Build composite alert rules, e.g. "RSI > 70 AND sentiment == bullish".
const METRICS = ["rsi", "sentiment", "action", "confidence", "risk_score", "macd_histogram", "bias"];
const OPS = [">", ">=", "<", "<=", "==", "!="];

interface Cond {
  metric: string;
  op: string;
  value: string;
}

export function AlertManager() {
  const { symbol } = useStore();
  const [name, setName] = useState("");
  const [combine, setCombine] = useState<"all" | "any">("all");
  const [conds, setConds] = useState<Cond[]>([{ metric: "rsi", op: ">", value: "70" }]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [triggered, setTriggered] = useState<any[]>([]);

  const refresh = () => {
    api.alerts().then((d) => setAlerts(d.alerts)).catch(() => {});
    api.triggered().then((d) => setTriggered(d.triggered)).catch(() => {});
  };
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, []);

  // Request browser notification permission for push.
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      triggered.slice(0, 1).forEach((t) => new Notification(`NeuroMax: ${t.alert}`, { body: `${t.symbol} → ${t.action}` }));
    }
  }, [triggered]);

  const create = async () => {
    if (!name) return;
    const rule = {
      [combine]: conds.map((c) => ({
        metric: c.metric,
        op: c.op,
        value: isNaN(Number(c.value)) ? c.value : Number(c.value),
      })),
    };
    await api.createAlert({ name, rule, symbol });
    setName("");
    refresh();
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardTitle>Create Alert · {symbol}</CardTitle>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="alert name"
          className="mb-2 w-full rounded-lg border border-border bg-base px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <div className="mb-2 flex gap-2">
          {(["all", "any"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCombine(c)}
              className={`flex-1 rounded-lg py-1 text-[10px] uppercase ${combine === c ? "bg-accent text-white" : "border border-border text-muted"}`}
            >
              {c === "all" ? "Match ALL (AND)" : "Match ANY (OR)"}
            </button>
          ))}
        </div>
        {conds.map((c, i) => (
          <div key={i} className="mb-2 flex gap-1">
            <select
              value={c.metric}
              onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, metric: e.target.value } : x)))}
              className="flex-1 rounded border border-border bg-base px-1 py-1 text-xs"
            >
              {METRICS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <select
              value={c.op}
              onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)))}
              className="rounded border border-border bg-base px-1 py-1 text-xs"
            >
              {OPS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <input
              value={c.value}
              onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
              className="w-20 rounded border border-border bg-base px-1 py-1 text-xs"
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setConds([...conds, { metric: "sentiment", op: "==", value: "bullish" }])}>
            + condition
          </Button>
          <Button onClick={create} className="flex-1">Create</Button>
        </div>
      </Card>

      <Card>
        <CardTitle right={<span className="text-[10px] text-muted">{alerts.length} active</span>}>Alerts & Triggers</CardTitle>
        <div className="mb-2 space-y-1">
          {alerts.map((a) => (
            <div key={a.id} className="rounded border border-border p-2 text-xs">
              <span className="font-semibold">{a.name}</span>
              <span className="ml-2 text-muted">{a.symbol || "any"}</span>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-xs text-muted">No alerts yet.</p>}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted">Recently triggered</div>
        <div className="mt-1 space-y-1">
          {triggered.length === 0 && <p className="text-xs text-muted">None.</p>}
          {triggered.map((t, i) => (
            <div key={i} className="rounded border border-accent/40 p-2 text-xs">
              <span className="text-accent">{t.alert}</span> · {t.symbol} → {t.action}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
