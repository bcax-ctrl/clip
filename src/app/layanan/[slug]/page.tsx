import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, Clock, FileText, ChevronLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Timeline } from "@/components/timeline";
import { ServiceIcon } from "@/components/icon-map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { layananList, getLayananBySlug } from "@/lib/data";

export function generateStaticParams() {
  return layananList.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const layanan = getLayananBySlug(slug);
  if (!layanan) return {};
  return {
    title: layanan.judul,
    description: layanan.ringkasan,
  };
}

export default async function LayananDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const layanan = getLayananBySlug(slug);

  if (!layanan) {
    notFound();
  }

  return (
    <div>
      <PageHeader title={layanan.judul} description={layanan.ringkasan} />

      <section className="container-page py-10">
        <Button asChild variant="ghost" className="mb-6 -ml-3">
          <Link href="/layanan">
            <ChevronLeft className="size-5" aria-hidden="true" />
            Kembali ke Layanan
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-extrabold">
                <FileText className="size-6 text-primary" aria-hidden="true" />
                Syarat Dokumen
              </h2>
              <ul className="mt-4 space-y-3">
                {layanan.syarat.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 rounded-lg border border-border bg-card p-4 text-lg"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                      {idx + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-extrabold">Alur Layanan</h2>
              <div className="mt-6">
                <Timeline steps={layanan.alur} />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <Card>
              <CardContent>
                <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                  <ServiceIcon name={layanan.icon} className="size-6" />
                </span>
                <p className="mt-3 text-lg font-bold">{layanan.judul}</p>
                <p className="mt-1 text-base text-muted-foreground">
                  {layanan.ringkasan}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex gap-3">
                <Banknote className="size-6 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-base font-bold">Biaya</p>
                  <p className="text-base text-muted-foreground">
                    {layanan.biaya}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex gap-3">
                <Clock className="size-6 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-base font-bold">Estimasi Waktu</p>
                  <p className="text-base text-muted-foreground">
                    {layanan.estimasiWaktu}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/40 bg-secondary/60">
              <CardContent>
                <p className="text-base">
                  Butuh bantuan lebih lanjut? Hubungi kami melalui halaman{" "}
                  <Link
                    href="/kontak"
                    className="font-semibold text-primary hover:underline"
                  >
                    Kontak &amp; Pengaduan
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
