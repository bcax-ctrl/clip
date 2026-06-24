import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroMax Personal — AI Trading Terminal",
  description: "Your single comprehensive AI trading platform: analysis, portfolio, trade, charts, alerts, backtest.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-mono">{children}</body>
    </html>
  );
}
