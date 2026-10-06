import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import type { BeritaMeta } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "berita");

function readSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getAllBerita(): BeritaMeta[] {
  const slugs = readSlugs();

  const items = slugs.map((slug) => {
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    const raw = fs.readFileSync(filePath, "utf8");
    const { data } = matter(raw);

    return {
      slug,
      title: data.title as string,
      date: data.date as string,
      category: data.category as string,
      excerpt: data.excerpt as string,
      image: data.image as string | undefined,
    };
  });

  return items.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getBeritaCategories(): string[] {
  const set = new Set(getAllBerita().map((b) => b.category));
  return Array.from(set);
}

export function getBeritaBySlug(
  slug: string
): { meta: BeritaMeta; content: string } | undefined {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return undefined;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    meta: {
      slug,
      title: data.title as string,
      date: data.date as string,
      category: data.category as string,
      excerpt: data.excerpt as string,
      image: data.image as string | undefined,
    },
    content,
  };
}

export function getLatestBerita(count: number): BeritaMeta[] {
  return getAllBerita().slice(0, count);
}
