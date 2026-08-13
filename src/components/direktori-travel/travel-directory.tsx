"use client";

import * as React from "react";
import { Search, ShieldAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Kabupaten } from "@/lib/types";

type Row = {
  nama: string;
  jenis: "PPIU" | "PIHK";
  kabupatenId: string;
  namaKabupaten: string;
  nomorSK: string;
  masaBerlakuSK: string;
  alamat: string;
  telepon: string;
  status: "aktif" | "kedaluwarsa";
};

export function TravelDirectory({
  data,
  kabupatenList,
}: {
  data: Row[];
  kabupatenList: Kabupaten[];
}) {
  const [query, setQuery] = React.useState("");
  const [kabupatenId, setKabupatenId] = React.useState<string>("semua");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      const matchQuery = q ? row.nama.toLowerCase().includes(q) : true;
      const matchKabupaten =
        kabupatenId === "semua" ? true : row.kabupatenId === kabupatenId;
      return matchQuery && matchKabupaten;
    });
  }, [data, query, kabupatenId]);

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
        <ShieldAlert className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-lg font-bold">Waspada Penipuan Travel!</p>
          <p className="mt-1 text-base">
            Pastikan travel yang Anda pilih terdaftar resmi dengan status{" "}
            <strong>aktif</strong> pada daftar di bawah ini. Jangan melakukan
            pembayaran ke travel tanpa izin resmi atau dengan harga yang
            tidak wajar. Data pada halaman ini bersifat contoh — verifikasi
            ulang melalui kanal resmi Kementerian Haji dan Umrah atau hubungi
            kami sebelum membayar.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama travel..."
            className="pl-11"
            aria-label="Cari nama travel"
          />
        </div>
        <Select value={kabupatenId} onValueChange={setKabupatenId}>
          <SelectTrigger className="sm:w-72" aria-label="Filter kabupaten/kota">
            <SelectValue placeholder="Semua kabupaten/kota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kabupaten/Kota</SelectItem>
            {kabupatenList.map((kab) => (
              <SelectItem key={kab.id} value={kab.id}>
                {kab.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mb-4 text-base text-muted-foreground">
        Menampilkan {filtered.length} dari {data.length} travel.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map((row) => (
          <Card key={row.nomorSK}>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={row.jenis === "PPIU" ? "default" : "accent"}>
                  {row.jenis}
                </Badge>
                <Badge
                  variant={row.status === "aktif" ? "success" : "destructive"}
                >
                  {row.status === "aktif" ? "Izin Aktif" : "Izin Kedaluwarsa"}
                </Badge>
              </div>
              <p className="mt-3 text-lg font-bold">{row.nama}</p>
              <p className="text-base text-muted-foreground">{row.alamat}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="font-semibold">Kabupaten/Kota:</dt>
                  <dd>{row.namaKabupaten}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold">No. SK Izin:</dt>
                  <dd>{row.nomorSK}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold">Masa Berlaku:</dt>
                  <dd>{row.masaBerlakuSK}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold">Telepon:</dt>
                  <dd>{row.telepon}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 ? (
          <p className="col-span-full py-10 text-center text-lg text-muted-foreground">
            Tidak ada travel yang cocok dengan pencarian Anda.
          </p>
        ) : null}
      </div>
    </div>
  );
}
