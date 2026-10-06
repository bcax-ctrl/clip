"use client";

import * as React from "react";
import { ArrowUpDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Row = {
  kabupatenId: string;
  namaKabupaten: string;
  kuotaTahunan: number;
  jumlahDaftarTunggu: number;
  estimasiTungguTahun: number;
};

type SortKey = keyof Pick<
  Row,
  "namaKabupaten" | "kuotaTahunan" | "jumlahDaftarTunggu" | "estimasiTungguTahun"
>;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "namaKabupaten", label: "Kabupaten/Kota" },
  { key: "kuotaTahunan", label: "Kuota Tahunan" },
  { key: "jumlahDaftarTunggu", label: "Jumlah Daftar Tunggu" },
  { key: "estimasiTungguTahun", label: "Estimasi Tunggu (tahun)" },
];

export function DaftarTungguTable({ data }: { data: Row[] }) {
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("namaKabupaten");
  const [sortAsc, setSortAsc] = React.useState(true);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? data.filter((row) => row.namaKabupaten.toLowerCase().includes(q))
      : data;

    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "string"
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number);
      return sortAsc ? cmp : -cmp;
    });
  }, [data, query, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari kabupaten/kota..."
          className="pl-11"
          aria-label="Cari kabupaten atau kota"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead key={col.key}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort(col.key)}
                  className="h-auto gap-1.5 px-2 py-1 text-base font-bold"
                  aria-label={`Urutkan berdasarkan ${col.label}`}
                >
                  {col.label}
                  <ArrowUpDown className="size-4" aria-hidden="true" />
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                Tidak ada data yang cocok.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((row) => (
              <TableRow key={row.kabupatenId}>
                <TableCell className="font-semibold">
                  {row.namaKabupaten}
                </TableCell>
                <TableCell>{row.kuotaTahunan.toLocaleString("id-ID")}</TableCell>
                <TableCell>
                  {row.jumlahDaftarTunggu.toLocaleString("id-ID")}
                </TableCell>
                <TableCell>~{row.estimasiTungguTahun} tahun</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
