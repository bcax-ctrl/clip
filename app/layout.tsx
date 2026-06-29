import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClipMine — AI Video Clipper',
  description: 'Auto-generate viral short clips from long-form videos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0A0A0A] text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
