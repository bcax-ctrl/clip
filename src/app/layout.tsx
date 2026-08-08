import type { Metadata } from "next";
import "./globals.css";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { site } from "@/lib/data";

export const metadata: Metadata = {
  title: {
    default: `${site.namaInstansi} — ${site.namaKanwil}`,
    template: `%s — ${site.singkatan}`,
  },
  description:
    "Situs resmi Bidang Penyelenggaraan Haji dan Umrah (PHU) Kantor Wilayah Kementerian Agama Provinsi Kalimantan Selatan. Informasi pendaftaran haji, layanan, daftar tunggu, direktori travel, dan pengaduan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a href="#konten-utama" className="skip-link">
          Langsung ke konten utama
        </a>
        <SiteHeader />
        <main id="konten-utama" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
