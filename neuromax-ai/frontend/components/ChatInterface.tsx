"use client";

import { useRef, useState } from "react";
import { clsx } from "clsx";
import { Send } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "./ui/card";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

// Streaming chat with the orchestrator. Renders tokens as they arrive.
export function ChatInterface({ symbol }: { symbol: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: `Ask me anything about ${symbol} or the wider market. I can synthesise sentiment, technicals, whale flow, macro and on-chain signals — in English or Bahasa Indonesia.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }, { role: "assistant", text: "" }]);
    setStreaming(true);
    try {
      for await (const chunk of api.chat(text, symbol)) {
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "assistant", text: next[next.length - 1].text + chunk };
          return next;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", text: "Connection error. Please try again." };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <Card className="flex h-[480px] flex-col">
      <CardTitle right={streaming ? <span className="text-xs text-accent">thinking…</span> : null}>
        NeuroMax Chat
      </CardTitle>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed",
                m.role === "user" ? "bg-accent text-white" : "bg-border/60 text-zinc-200"
              )}
            >
              {m.text || <span className="text-muted">▍</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Ask about ${symbol}…`}
          className="flex-1 rounded-lg border border-border bg-base px-3 py-2 text-xs outline-none focus:border-accent"
        />
        <button
          onClick={send}
          disabled={streaming}
          className="flex items-center justify-center rounded-lg bg-accent px-3 text-white disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>
    </Card>
  );
}
