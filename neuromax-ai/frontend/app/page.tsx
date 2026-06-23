import Link from "next/link";

const FEATURES = [
  ["5 Parallel AI Agents", "Sentiment, technical, whale, macro & on-chain agents run concurrently and report to a Claude-powered orchestrator."],
  ["All Markets, One View", "Crypto, stocks, forex and commodities in a single Bloomberg-grade terminal."],
  ["Risk-Scored Insights", "Every analysis returns a 1-10 risk score, confidence %, and a BUY/SELL/HOLD/WATCH call."],
  ["Bilingual (EN + ID)", "Full English and Bahasa Indonesia output on every recommendation."],
  ["Live Whale Tracking", "Surface large order flow and net buy/sell pressure in real time."],
  ["Long-Term Memory", "The orchestrator recalls your past analyses to keep context across sessions."],
];

export default function Landing() {
  return (
    <div className="py-10">
      <section className="mx-auto max-w-3xl text-center">
        <span className="pill border-accent/40 text-accent">More powerful than the rest</span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
          NeuroMax <span className="text-accent">AI</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
          A production-grade, multi-agent financial intelligence platform. Synthesise sentiment,
          technicals, whale flow, macro and on-chain data into one decisive call — in seconds.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/dashboard" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/80">
            Launch Terminal
          </Link>
          <Link href="/agents" className="rounded-lg border border-border px-5 py-2.5 text-sm text-muted hover:text-white">
            Meet the Agents
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-14 grid max-w-5xl gap-3 md:grid-cols-3">
        {FEATURES.map(([title, body]) => (
          <div key={title} className="panel p-5">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
