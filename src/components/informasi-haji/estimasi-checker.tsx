"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { validasiNomorPorsi, ESTIMASI_KETERANGAN, type HasilEstimasi } from "@/lib/estimasi";
import { cariEstimasiPorsiAction } from "@/app/informasi-haji/actions";

export function EstimasiChecker() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("nomor_porsi") ?? "";
  const initialValid = initial ? validasiNomorPorsi(initial) : false;

  const [nomorPorsi, setNomorPorsi] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(
    initial && !initialValid
      ? "Nomor porsi harus terdiri dari 10 digit angka."
      : null
  );
  const [hasil, setHasil] = React.useState<HasilEstimasi | null>(null);
  const [loading, setLoading] = React.useState(initialValid);

  React.useEffect(() => {
    if (!initial || !validasiNomorPorsi(initial)) return;

    let cancelled = false;
    cariEstimasiPorsiAction(initial).then((result) => {
      if (!cancelled) {
        setHasil(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validasiNomorPorsi(nomorPorsi)) {
      setError("Nomor porsi harus terdiri dari 10 digit angka.");
      setHasil(null);
      return;
    }

    setError(null);
    setLoading(true);
    const result = await cariEstimasiPorsiAction(nomorPorsi);
    setHasil(result);
    setLoading(false);
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="nomor-porsi">Nomor Porsi (10 digit)</Label>
            <Input
              id="nomor-porsi"
              inputMode="numeric"
              maxLength={10}
              placeholder="Contoh: 3200001234"
              value={nomorPorsi}
              onChange={(e) => setNomorPorsi(e.target.value.replace(/\D/g, ""))}
              className="mt-2"
              aria-describedby="nomor-porsi-help"
            />
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            <Search className="size-5" aria-hidden="true" />
            {loading ? "Mencari..." : "Cek Estimasi"}
          </Button>
        </form>
        <p id="nomor-porsi-help" className="mt-3 text-sm text-muted-foreground">
          {ESTIMASI_KETERANGAN}
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p className="text-base font-medium">{error}</p>
          </div>
        ) : null}

        {hasil && !error ? (
          hasil.ditemukan && hasil.data ? (
            <div
              role="status"
              className="mt-5 rounded-lg border border-success/30 bg-success/10 p-5"
            >
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="size-5" aria-hidden="true" />
                <p className="text-lg font-bold">Data Ditemukan</p>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Nama</dt>
                  <dd className="text-lg font-semibold">{hasil.data.nama}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Kabupaten/Kota
                  </dt>
                  <dd className="text-lg font-semibold">
                    {hasil.data.namaKabupaten}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Estimasi Tahun Berangkat
                  </dt>
                  <dd className="text-lg font-semibold">
                    {hasil.data.tahunPerkiraanBerangkat}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd className="text-lg font-semibold">{hasil.data.status}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="text-base font-medium">
                Nomor porsi tidak ditemukan pada data kami. Pastikan nomor
                yang dimasukkan sudah benar, atau hubungi Kantor Kementerian
                Haji dan Umrah Kabupaten/Kota tempat Anda mendaftar.
              </p>
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
