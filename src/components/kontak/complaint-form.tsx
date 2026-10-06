"use client";

import * as React from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ComplaintForm({ email }: { email: string }) {
  const [nama, setNama] = React.useState("");
  const [kontak, setKontak] = React.useState("");
  const [pesan, setPesan] = React.useState("");
  const [sent, setSent] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const subject = `Pengaduan dari ${nama || "Masyarakat"}`;
    const body = `Nama: ${nama}\nKontak: ${kontak}\n\nIsi Pengaduan:\n${pesan}`;
    const mailto = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="nama">Nama Lengkap</Label>
        <Input
          id="nama"
          required
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="kontak">Nomor HP / Email</Label>
        <Input
          id="kontak"
          required
          value={kontak}
          onChange={(e) => setKontak(e.target.value)}
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="pesan">Isi Pengaduan / Pertanyaan</Label>
        <Textarea
          id="pesan"
          required
          value={pesan}
          onChange={(e) => setPesan(e.target.value)}
          className="mt-2"
          rows={5}
        />
      </div>
      <Button type="submit" size="lg">
        <Send className="size-5" aria-hidden="true" />
        Kirim Pengaduan
      </Button>
      <p className="text-sm text-muted-foreground" role="status">
        {sent
          ? "Aplikasi email Anda akan terbuka untuk mengirim pesan ke kami. Untuk pengaduan resmi dan pelacakan tindak lanjut, gunakan kanal LAPOR!."
          : "Tombol kirim akan membuka aplikasi email Anda dengan pesan yang sudah terisi."}
      </p>
    </form>
  );
}
