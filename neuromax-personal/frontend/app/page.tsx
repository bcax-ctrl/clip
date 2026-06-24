"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Landing + lightweight auth. Personal use: register or log in, or just enter
// the terminal (the backend runs single-user without forced auth).
export default function Landing() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await (mode === "login" ? api.login(email, password) : api.register(email, password));
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message?.slice(0, 120) || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-block h-3 w-3 rounded-sm bg-accent" />
          <h1 className="text-3xl font-bold tracking-tight">
            NeuroMax <span className="text-accent">Personal</span>
          </h1>
          <p className="mt-2 text-xs text-muted">
            One terminal: AI analysis · portfolio · trade · charts · alerts · backtest
          </p>
        </div>

        <Card>
          <div className="mb-3 flex gap-2">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-1.5 text-xs uppercase tracking-wider ${
                  mode === m ? "bg-accent text-white" : "border border-border text-muted"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="mb-2 w-full rounded-lg border border-border bg-base px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password (min 8)"
            className="mb-3 w-full rounded-lg border border-border bg-base px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && <p className="mb-2 text-xs text-bearish">{error}</p>}
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
          </Button>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-3 w-full text-center text-xs text-muted hover:text-white"
          >
            Skip — enter terminal (single-user mode) →
          </button>
        </Card>
      </div>
    </div>
  );
}
