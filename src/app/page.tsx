import Link from "next/link";
import {
  CalendarCheck,
  ClipboardList,
  PlaneTakeoff,
  Users2,
  ArrowRight,
} from "lucide-react";

import { AnnouncementTicker } from "@/components/announcement-ticker";
import { HeroSearch } from "@/components/home/hero-search";
import { StatCard } from "@/components/home/stat-card";
import { ServiceIcon } from "@/components/icon-map";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { site, statistik, layananList } from "@/lib/data";
import { getLatestBerita, formatTanggalIndonesia } from "@/lib/berita";

const LAYANAN_UTAMA_SLUGS = [
  "pendaftaran-haji-reguler",
  "pembatalan-porsi-haji",
  "rekomendasi-izin-ppiu-pihk",
  "pendaftaran-haji-khusus",
];

export default function Home() {
  const layananUtama = LAYANAN_UTAMA_SLUGS.map((slug) =>
    layananList.find((l) => l.slug === slug)
  ).filter((l): l is NonNullable<typeof l> => Boolean(l));

  const beritaTerbaru = getLatestBerita(3);

  return (
    <div className="flex flex-col">
      <AnnouncementTicker items={site.pengumumanBerjalan} />

      <section className="bg-gradient-to-b from-secondary to-background">
        <div className="container-page grid gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="secondary" className="mb-4">
              {site.namaKanwil}
            </Badge>
            <h1 className="text-3xl font-extrabold leading-tight text-primary sm:text-4xl lg:text-5xl">
              Layanan Haji dan Umrah Kalimantan Selatan
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Informasi resmi pendaftaran haji, layanan dokumen, daftar
              tunggu, dan direktori travel berizin bagi masyarakat
              Kalimantan Selatan.
            </p>
          </div>
          <HeroSearch />
        </div>
      </section>

      <section className="container-page py-12 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Layanan Utama
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Pilih layanan yang Anda butuhkan.
            </p>
          </div>
          <Button asChild variant="link" className="hidden sm:inline-flex">
            <Link href="/layanan">
              Semua layanan <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {layananUtama.map((layanan) => (
            <Link key={layanan.slug} href={`/layanan/${layanan.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                    <ServiceIcon name={layanan.icon} className="size-6" />
                  </span>
                  <CardTitle>{layanan.judul}</CardTitle>
                  <CardDescription>{layanan.ringkasan}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Button asChild variant="outline" className="mt-6 w-full sm:hidden">
          <Link href="/layanan">
            Semua layanan <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      <section className="bg-secondary/50 py-12 sm:py-16">
        <div className="container-page">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Statistik Ringkas {statistik.tahun}
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            {statistik.keterangan}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <StatCard
              icon={ClipboardList}
              value={statistik.kuotaProvinsi.toLocaleString("id-ID")}
              label={`Kuota Haji Provinsi Tahun ${statistik.tahun}`}
            />
            <StatCard
              icon={PlaneTakeoff}
              value={statistik.jemaahBerangkatTahunLalu.toLocaleString(
                "id-ID"
              )}
              label="Jemaah Diberangkatkan Tahun Lalu"
            />
            <StatCard
              icon={Users2}
              value={statistik.totalDaftarTunggu.toLocaleString("id-ID")}
              label="Total Daftar Tunggu Se-Kalsel"
            />
          </div>
          <Button asChild variant="link" className="mt-4">
            <Link href="/informasi-haji">
              Lihat rincian per kabupaten/kota <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="container-page py-12 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Berita &amp; Pengumuman Terbaru
            </h2>
          </div>
          <Button asChild variant="link" className="hidden sm:inline-flex">
            <Link href="/berita">
              Semua berita <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {beritaTerbaru.map((berita) => (
            <Link key={berita.slug} href={`/berita/${berita.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge>{berita.category}</Badge>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarCheck className="size-4" aria-hidden="true" />
                      {formatTanggalIndonesia(berita.date)}
                    </span>
                  </div>
                  <CardTitle>{berita.title}</CardTitle>
                  <CardDescription>{berita.excerpt}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Button asChild variant="outline" className="mt-6 w-full sm:hidden">
          <Link href="/berita">
            Semua berita <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
