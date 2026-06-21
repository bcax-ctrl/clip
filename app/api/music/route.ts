import { NextResponse } from "next/server";
import { listMusic, MUSIC_CATEGORIES } from "@/lib/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    categories: MUSIC_CATEGORIES,
    library: listMusic(),
  });
}
