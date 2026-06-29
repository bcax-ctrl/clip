// GET /api/clips/[jobId]/[clipId] — stream a generated clip file.
//
// Query params:
//   ?layer=v11_final   which layer file to stream (default v11_final)
//   ?thumb=1           stream the JPEG thumbnail instead
//   ?download=1        send as an attachment download

import { NextRequest } from 'next/server';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { clipDir, getClip } from '@/lib/jobQueue';
import type { LayerKey } from '@/lib/types';

export const runtime = 'nodejs';

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

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string; clipId: string } }
) {
  const { jobId, clipId } = params;
  const url = new URL(req.url);
  const dir = clipDir(jobId, clipId);

  // Thumbnail.
  if (url.searchParams.get('thumb')) {
    const thumbPath = path.join(dir, 'thumb.jpg');
    return streamFile(req, thumbPath, 'image/jpeg');
  }

  const layer = (url.searchParams.get('layer') as LayerKey) || 'v11_final';
  const fileName = LAYER_FILES[layer] || LAYER_FILES.v11_final;
  const filePath = path.join(dir, fileName);

  const clip = getClip(jobId, clipId);
  const downloadName = clip
    ? `${slug(clip.title)}_${layer}.mp4`
    : `${clipId}_${layer}.mp4`;
  const asAttachment = url.searchParams.get('download') === '1';

  return streamFile(
    req,
    filePath,
    'video/mp4',
    asAttachment ? downloadName : undefined
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'clip';
}

async function streamFile(
  req: NextRequest,
  filePath: string,
  contentType: string,
  downloadName?: string
): Promise<Response> {
  let stat: fs.Stats;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const total = stat.size;
  const range = req.headers.get('range');

  const baseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
  };
  if (downloadName) {
    baseHeaders['Content-Disposition'] = `attachment; filename="${downloadName}"`;
  }

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const startStr = match?.[1] ?? '';
    const endStr = match?.[2] ?? '';
    const start = startStr ? parseInt(startStr, 10) : 0;
    const end = endStr ? parseInt(endStr, 10) : total - 1;

    if (start >= total || end >= total) {
      return new Response('Range Not Satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${total}` },
      });
    }

    const chunkSize = end - start + 1;
    const nodeStream = fs.createReadStream(filePath, { start, end });
    return new Response(nodeStream as any, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Content-Length': String(chunkSize),
      },
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  return new Response(nodeStream as any, {
    status: 200,
    headers: { ...baseHeaders, 'Content-Length': String(total) },
  });
}
