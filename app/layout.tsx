import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "ClipForge — Auto Video Clipper",
  description:
    "Tool lokal untuk bikin clip viral (Shorts/TikTok) dari video panjang: auto subtitle, musik, crop 9:16, hook text.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ClipForge",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <PwaRegister />
        <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6">
          <header className="mb-6 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <span className="text-lg font-extrabold tracking-tight">
                Clip<span className="text-brand">Forge</span>
              </span>
            </a>
            <a
              href="/"
              className="text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              Job baru
            </a>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
