'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import BeforeAfterPlayer from '@/components/BeforeAfterPlayer';
import type { LayerKey } from '@/lib/types';

const LAYER_OPTIONS: { key: LayerKey; label: string }[] = [
  { key: 'v1_raw', label: 'V1 Raw' },
  { key: 'v2_base', label: 'V2 Base Footage' },
  { key: 'v4_bottomvignette', label: 'V4 + Bottom Vignette' },
  { key: 'v5_vignette', label: 'V5 + Full Vignette' },
  { key: 'v6_lightleak', label: 'V6 + Light Leak' },
  { key: 'v7_dust', label: 'V7 + Film Dust' },
  { key: 'v8_grain', label: 'V8 + Grain' },
  { key: 'v9_grade1', label: 'V9 + Color Grade 1' },
  { key: 'v10_grade2', label: 'V10 + Color Grade 2 (Cinematic)' },
  { key: 'v11_final', label: 'V11 Final (+ Subtitles)' },
];

export default function ComparePage({
  params,
}: {
  params: { jobId: string; clipId: string };
}) {
  const { jobId, clipId } = params;
  const [mode, setMode] = useState<'split' | 'swipe'>('split');
  const [synced, setSynced] = useState(true);
  const [layer, setLayer] = useState<LayerKey>('v11_final');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);

  const loadLayers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/clips/${jobId}/${clipId}/layers?generate=1`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load layers.');
      setUrls(data.urls || {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load layers.');
    } finally {
      setLoading(false);
    }
  }, [jobId, clipId]);

  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

  const share = () => {
    navigator.clipboard?.writeText(window.location.href);
    setShared(true);
    setTimeout(() => setShared(false), 1500);
  };

  const rawSrc =
    urls.v1_raw || `/api/clips/${jobId}/${clipId}?layer=v1_raw`;
  const processedSrc =
    urls[layer] || `/api/clips/${jobId}/${clipId}?layer=${layer}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/jobs/${jobId}`}
            className="text-sm text-white/50 transition hover:text-white"
          >
            ← Back to clips
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Before / After</h1>
        </div>
        <button onClick={share} className="btn-ghost text-sm">
          {shared ? 'Link copied!' : '🔗 Share'}
        </button>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-surface p-4">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-ink p-1">
          {(['split', 'swipe'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                mode === m
                  ? 'bg-amber text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {m} View
            </button>
          ))}
        </div>

        {/* Layer selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-white/50">After layer</label>
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value as LayerKey)}
            className="rounded-lg border border-white/10 bg-ink px-3 py-1.5 text-sm text-white outline-none focus:border-amber/60"
          >
            {LAYER_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sync toggle */}
        <button
          onClick={() => setSynced((s) => !s)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            synced
              ? 'bg-amber/20 text-amber'
              : 'bg-ink text-white/50'
          }`}
        >
          {synced ? '🔒 Synced' : '🔓 Unsynced'}
        </button>
      </div>

      {loading && (
        <div className="rounded-xl border border-white/5 bg-surface p-12 text-center text-white/60">
          Rendering layer variants with FFmpeg… this can take a moment.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          <p className="font-semibold">Could not load comparison</p>
          <p className="mt-1">{error}</p>
          <button onClick={loadLayers} className="btn-ghost mt-4 text-sm">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <BeforeAfterPlayer
          key={`${mode}-${layer}-${synced}`}
          rawSrc={rawSrc}
          processedSrc={processedSrc}
          mode={mode}
          synced={synced}
        />
      )}
    </div>
  );
}
