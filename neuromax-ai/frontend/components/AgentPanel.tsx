"use client";

import { clsx } from "clsx";
import type { AgentStatus } from "@/lib/api";
import { Card, CardTitle } from "./ui/card";

// Shows which agents ran, their latency, and ok/error state. While an analysis
// is in flight (`running`), all agents pulse to convey live work.
export function AgentPanel({
  agents,
  running,
}: {
  agents: AgentStatus[];
  running: boolean;
}) {
  const fallback = [
    { name: "sentiment", label: "Sentiment Agent" },
    { name: "technical", label: "Technical Agent" },
    { name: "whale", label: "Whale Agent" },
    { name: "macro", label: "Macro Agent" },
    { name: "onchain", label: "On-Chain Agent" },
  ];
  const rows = agents.length ? agents : fallback.map((f) => ({ ...f, status: "ok", elapsed_ms: 0, error: null } as AgentStatus));

  return (
    <Card>
      <CardTitle right={running ? <span className="text-xs text-accent">working…</span> : null}>
        Agent Status
      </CardTitle>
      <div className="space-y-2">
        {rows.map((a) => {
          const state = running ? "running" : a.status;
          return (
            <div key={a.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span
                  className={clsx(
                    "h-2 w-2 rounded-full",
                    state === "running" && "animate-pulse bg-accent",
                    state === "ok" && "bg-bullish",
                    state === "error" && "bg-bearish"
                  )}
                />
                {a.label}
              </span>
              <span className="text-muted">
                {running ? "…" : a.elapsed_ms ? `${a.elapsed_ms}ms` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
