import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClipMine — AI Video Clipper',
  description:
    'Turn long-form video into viral short clips with AI-detected moments and TikTok-style subtitles.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-white">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber text-lg font-black text-black">
                ⛏
              </span>
              <span className="text-lg font-extrabold tracking-tight">
                Clip<span className="text-amber">Mine</span>
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-white/60">
              <Link href="/" className="transition hover:text-white">
                Upload
              </Link>
              <a
                href="https://github.com/openai/whisper"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                Docs
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
