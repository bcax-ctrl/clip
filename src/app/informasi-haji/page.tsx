import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays, MapPin, PlaneTakeoff } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EstimasiChecker } from "@/components/informasi-haji/estimasi-checker";
import { DaftarTungguTable } from "@/components/informasi-haji/daftar-tunggu-table";
import { StatCard } from "@/components/home/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  statistik,
  embarkasi,
  getDaftarTungguGabungan,
  getManasikGabungan,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Informasi Haji",
  description:
    "Cek estimasi keberangkatan, daftar tunggu per kabupaten/kota, kuota provinsi, jadwal manasik, dan embarkasi haji Kalimantan Selatan.",
};

export default function InformasiHajiPage() {
  const daftarTunggu = getDaftarTungguGabungan();
  const manasik = getManasikGabungan();

  return (
    <div>
      <PageHeader
        title="Informasi Haji"
        description="Estimasi keberangkatan, daftar tunggu, kuota, jadwal manasik, dan embarkasi haji se-Kalimantan Selatan."
      />

      <section className="container-page py-12">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          Cek Estimasi Keberangkatan
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
          Masukkan nomor porsi haji Anda (10 digit) untuk melihat estimasi
          tahun keberangkatan.
        </p>
        <div className="mt-6 max-w-2xl">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-secondary" />}>
            <EstimasiChecker />
          </Suspense>
        </div>
      </section>

      <section className="bg-secondary/50 py-12">
        <div className="container-page">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Kuota Haji Provinsi {statistik.tahun}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <StatCard
              icon={PlaneTakeoff}
              value={statistik.kuotaReguler.toLocaleString("id-ID")}
              label="Kuota Haji Reguler"
            />
            <StatCard
              icon={PlaneTakeoff}
              value={statistik.kuotaKhusus.toLocaleString("id-ID")}
              label="Kuota Haji Khusus"
            />
            <StatCard
              icon={CalendarDays}
              value={`~${statistik.estimasiMasaTungguTahun} tahun`}
              label="Rata-rata Masa Tunggu Provinsi"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          Daftar Tunggu per Kabupaten/Kota
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
          Data dapat diurutkan dan dicari. Klik judul kolom untuk mengurutkan.
        </p>
        <div className="mt-6">
          <DaftarTungguTable data={daftarTunggu} />
        </div>
      </section>

      <section className="bg-secondary/50 py-12">
        <div className="container-page">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Jadwal Manasik Haji
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {manasik.map((item) => (
              <Card key={item.angkatan}>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-bold">{item.angkatan}</p>
                    <Badge variant="secondary">{item.lokasi}</Badge>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-base text-muted-foreground">
                    <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
                    {new Date(item.tanggalMulai).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    &ndash;{" "}
                    {new Date(item.tanggalSelesai).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="mt-3 text-base">
                    Peserta:{" "}
                    <span className="font-medium">
                      {item.namaKabupatenPeserta.join(", ")}
                    </span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Embarkasi</h2>
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <PlaneTakeoff className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-lg font-bold">{embarkasi.nama}</p>
                <p className="text-base text-muted-foreground">
                  {embarkasi.bandara}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-base font-bold">Asrama Haji</p>
                <p className="text-base text-muted-foreground">
                  {embarkasi.alamatAsramaHaji}
                </p>
              </div>
            </div>
            <p className="text-base text-muted-foreground">
              {embarkasi.keterangan}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
