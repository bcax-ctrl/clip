// GET /api/clips/[jobId]/[clipId]/layers — list (and lazily generate) the
// 11-track layer outputs for a clip.
//
// The main pipeline only renders the final V11 export up front. The full layer
// stack (used by the Before/After compare view) is generated on first request
// here, then cached on disk.

import { NextRequest, NextResponse } from 'next/server';
import fsp from 'fs/promises';
import path from 'path';
import { clipDir, getClip, getJob } from '@/lib/jobQueue';
import { generateLayers } from '@/lib/ffmpegLayers';
import type { ClipLayers, LayerKey } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const LAYER_FILES: Record<LayerKey, string> = {
  v1_raw: 'clip_v1_raw.mp4',
  v2_base: 'clip_v2_base.mp4',
  v4_bottomvignette: 'clip_v4_bottomvignette.mp4',
  v5_vignette: 'clip_v5_vignette.mp4',
  v6_lightleak: 'clip_v6_lightleak.mp4',
  v7_dust: 'clip_v7_dust.mp4',
  v8_grain: 'clip_v8_grain.mp4',
  v9_grade1: 'clip_v9_grade1.mp4',
  v10_grade2: 'clip_v10_grade2.mp4',
  v11_final: 'clip_v11_final.mp4',
};

async function exists(p: string): Promise<boolean> {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function presentLayers(dir: string): Promise<ClipLayers> {
  const out: ClipLayers = {};
  for (const [key, file] of Object.entries(LAYER_FILES) as [
    LayerKey,
    string
  ][]) {
    if (await exists(path.join(dir, file))) {
      out[key] = path.join(dir, file);
    }
  }
  return out;
}

function toUrls(jobId: string, clipId: string, layers: ClipLayers) {
  const urls: Record<string, string> = {};
  for (const key of Object.keys(layers) as LayerKey[]) {
    urls[key] = `/api/clips/${jobId}/${clipId}?layer=${key}`;
  }
  return urls;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string; clipId: string } }
) {
  const { jobId, clipId } = params;
  const job = getJob(jobId);
  const clip = getClip(jobId, clipId);

  if (!job || !clip) {
    return NextResponse.json(
      { error: 'Job or clip not found.' },
      { status: 404 }
    );
  }

  const dir = clipDir(jobId, clipId);
  const url = new URL(req.url);
  const wantGenerate = url.searchParams.get('generate') === '1';

  let layers = await presentLayers(dir);

  // If the full stack is missing and generation was requested, render it now.
  const hasFullStack = layers.v1_raw && layers.v10_grade2;
  if (!hasFullStack && wantGenerate) {
    try {
      layers = await generateLayers(job.inputPath, clip, dir, {
        subtitleStyle: 'yellow',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Layer generation failed: ${message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    jobId,
    clipId,
    paths: layers,
    urls: toUrls(jobId, clipId, layers),
    complete: Boolean(layers.v1_raw && layers.v11_final),
  });
}
