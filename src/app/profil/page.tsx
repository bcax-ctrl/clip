import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, Target, Eye } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { OrgChart } from "@/components/org-chart";
import { Card, CardContent } from "@/components/ui/card";
import { profil } from "@/lib/data";

export const metadata: Metadata = {
  title: "Profil",
  description:
    "Sambutan Kepala Bidang, visi misi, tugas fungsi, struktur organisasi, dan sejarah singkat Bidang PHU Kanwil Kemenag Kalimantan Selatan.",
};

export default function ProfilPage() {
  return (
    <div>
      <PageHeader
        title="Profil Bidang PHU"
        description="Mengenal lebih dekat Bidang Penyelenggaraan Haji dan Umrah Kantor Wilayah Kementerian Agama Provinsi Kalimantan Selatan."
      />

      <section className="container-page py-12">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          Sambutan Kepala Bidang
        </h2>
        <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
          <div className="mx-auto w-40 md:w-full">
            <Image
              src={profil.sambutan.foto}
              alt={`Foto ${profil.sambutan.jabatan}`}
              width={220}
              height={220}
              className="w-full rounded-xl border border-border"
            />
            <p className="mt-3 text-center text-base font-bold md:text-left">
              {profil.sambutan.namaPejabat}
            </p>
            <p className="text-center text-sm text-muted-foreground md:text-left">
              {profil.sambutan.jabatan}
            </p>
          </div>
          <div className="space-y-4 text-lg leading-relaxed text-foreground/90">
            {profil.sambutan.isi.map((paragraf, idx) => (
              <p key={idx}>{paragraf}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary/50 py-12">
        <div className="container-page grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Eye className="size-6" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-extrabold">Visi</h2>
              <p className="text-lg text-muted-foreground">{profil.visi}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Target className="size-6" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-extrabold">Misi</h2>
              <ul className="space-y-2 text-lg text-muted-foreground">
                {profil.misi.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <CheckCircle2
                      className="mt-1 size-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold">Tugas</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              {profil.tugas}
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">Fungsi</h2>
            <ul className="mt-3 space-y-2 text-lg text-muted-foreground">
              {profil.fungsi.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <CheckCircle2
                    className="mt-1 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-secondary/50 py-12">
        <div className="container-page">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Struktur Organisasi
          </h2>
          <OrgChart
            kepala={profil.strukturOrganisasi.kepala}
            seksi={profil.strukturOrganisasi.seksi}
          />
        </div>
      </section>

      <section className="container-page py-12">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          Sejarah Singkat
        </h2>
        <div className="mt-6 space-y-4 text-lg leading-relaxed text-foreground/90">
          {profil.sejarah.map((paragraf, idx) => (
            <p key={idx}>{paragraf}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
