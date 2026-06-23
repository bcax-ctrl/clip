import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroMax AI — Financial Intelligence Platform",
  description:
    "Multi-agent, multi-asset market intelligence. Crypto, stocks, forex and commodities in one Bloomberg-grade terminal.",
};

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/agents", label: "AI Agents" },
  { href: "/social", label: "Social" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-mono">
        <header className="sticky top-0 z-50 border-b border-border bg-base/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-accent" />
              <span className="text-sm font-bold tracking-widest">NEUROMAX&nbsp;AI</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-white transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="pill ml-auto border-accent/40 text-accent">EN / ID</span>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
