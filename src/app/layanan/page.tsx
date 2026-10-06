import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ServiceIcon } from "@/components/icon-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { layananList } from "@/lib/data";

export const metadata: Metadata = {
  title: "Layanan",
  description:
    "Daftar layanan Kanwil Kementerian Haji dan Umrah Kalsel: pendaftaran haji reguler, pembatalan porsi, pelimpahan porsi, rekomendasi izin PPIU/PIHK, rekomendasi paspor, dan pendaftaran haji khusus.",
};

export default function LayananPage() {
  return (
    <div>
      <PageHeader
        title="Layanan"
        description="Pilih layanan di bawah ini untuk melihat syarat dokumen, alur, biaya, dan estimasi waktu penyelesaian."
      />

      <section className="container-page py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {layananList.map((layanan) => (
            <Link key={layanan.slug} href={`/layanan/${layanan.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                    <ServiceIcon name={layanan.icon} className="size-6" />
                  </span>
                  <CardTitle>{layanan.judul}</CardTitle>
                  <CardDescription>{layanan.ringkasan}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-base font-semibold text-primary">
                    Lihat detail <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-border bg-secondary/50 p-5 text-base">
          <p>
            Layanan di atas diproses melalui Kanwil dan Kantor Kementerian
            Haji dan Umrah Kabupaten/Kota se-Kalimantan Selatan. Untuk sistem
            transaksi resmi tingkat nasional (pendaftaran daring, pelunasan,
            dsb.), kunjungi{" "}
            <a
              href="https://haji.go.id/layanan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              portal Layanan Kementerian Haji dan Umrah RI
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
