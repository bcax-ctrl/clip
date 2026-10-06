"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTanggalIndonesia } from "@/lib/format";
import type { BeritaMeta } from "@/lib/types";

export function BeritaList({
  items,
  categories,
}: {
  items: BeritaMeta[];
  categories: string[];
}) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("Semua");

  const filtered = items.filter((item) => {
    const matchQuery = query
      ? item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.excerpt.toLowerCase().includes(query.toLowerCase())
      : true;
    const matchCategory = category === "Semua" ? true : item.category === category;
    return matchQuery && matchCategory;
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari berita atau pengumuman..."
            className="pl-11"
            aria-label="Cari berita"
          />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
        {["Semua", ...categories].map((cat) => (
          <Button
            key={cat}
            type="button"
            size="sm"
            variant={category === cat ? "default" : "outline"}
            onClick={() => setCategory(cat)}
            className={cn("rounded-full")}
            aria-pressed={category === cat}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <Link key={item.slug} href={`/berita/${item.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Badge>{item.category}</Badge>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    {formatTanggalIndonesia(item.date)}
                  </span>
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.excerpt}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-lg text-muted-foreground">
          Tidak ada berita yang cocok.
        </p>
      ) : null}
    </div>
  );
}
