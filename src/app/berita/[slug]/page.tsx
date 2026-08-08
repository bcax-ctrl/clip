import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import { CalendarDays, ChevronLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAllBerita,
  getBeritaBySlug,
  formatTanggalIndonesia,
} from "@/lib/berita";

export function generateStaticParams() {
  return getAllBerita().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBeritaBySlug(slug);
  if (!post) return {};
  return {
    title: post.meta.title,
    description: post.meta.excerpt,
  };
}

export default async function BeritaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBeritaBySlug(slug);

  if (!post) {
    notFound();
  }

  const { meta, content } = post;

  return (
    <div>
      <PageHeader title={meta.title} />

      <article className="container-page max-w-3xl py-10">
        <Button asChild variant="ghost" className="mb-6 -ml-3">
          <Link href="/berita">
            <ChevronLeft className="size-5" aria-hidden="true" />
            Kembali ke Berita
          </Link>
        </Button>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge>{meta.category}</Badge>
          <span className="flex items-center gap-1.5 text-base text-muted-foreground">
            <CalendarDays className="size-5" aria-hidden="true" />
            {formatTanggalIndonesia(meta.date)}
          </span>
        </div>

        {meta.image ? (
          <Image
            src={meta.image}
            alt={meta.title}
            width={800}
            height={450}
            className="mb-8 w-full rounded-xl border border-border object-cover"
          />
        ) : null}

        <div className="prose prose-lg max-w-none prose-headings:font-extrabold prose-a:text-primary prose-strong:text-foreground">
          <MDXRemote source={content} />
        </div>
      </article>
    </div>
  );
}
