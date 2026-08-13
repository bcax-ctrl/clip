"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HeroSearch() {
  const router = useRouter();
  const [nomorPorsi, setNomorPorsi] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = nomorPorsi.trim();
    if (value) {
      router.push(`/informasi-haji?nomor_porsi=${encodeURIComponent(value)}`);
    } else {
      router.push("/informasi-haji");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-lg sm:flex-row sm:items-end sm:p-5"
    >
      <div className="flex-1">
        <Label htmlFor="hero-nomor-porsi" className="text-foreground">
          Cek Estimasi Keberangkatan Haji
        </Label>
        <Input
          id="hero-nomor-porsi"
          inputMode="numeric"
          placeholder="Masukkan 10 digit nomor porsi"
          value={nomorPorsi}
          maxLength={10}
          onChange={(e) => setNomorPorsi(e.target.value.replace(/\D/g, ""))}
          className="mt-2"
        />
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto">
        <Search className="size-5" aria-hidden="true" />
        Cek Sekarang
      </Button>
    </form>
  );
}
