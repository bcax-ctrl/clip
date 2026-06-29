'use client';

import type { Clip } from '@/lib/types';

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? 'bg-amber text-black'
      : score >= 6
      ? 'bg-amber/30 text-amber'
      : 'bg-white/10 text-white/60';
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${color}`}
      title={`Viral score ${score}/10`}
    >
      {score}
    </span>
  );
}

export default function ClipSidebar({
  jobId,
  clips,
  activeId,
  onSelect,
}: {
  jobId: string;
  clips: Clip[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/5 bg-ink">
      <div className="border-b border-white/5 px-4 py-3">
        <h2 className="text-sm font-semibold text-white/80">
          Generated Clips
        </h2>
        <p className="text-xs text-white/40">{clips.length} clips</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {clips.length === 0 && (
          <p className="px-4 py-6 text-sm text-white/40">No clips yet…</p>
        )}
        {clips.map((clip) => {
          const active = clip.id === activeId;
          return (
            <button
              key={clip.id}
              onClick={() => onSelect(clip.id)}
              className={`flex w-full gap-3 border-b border-white/5 px-3 py-3 text-left transition ${
                active
                  ? 'bg-amber/10 shadow-[inset_3px_0_0_0_#F59E0B]'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/clips/${jobId}/${clip.id}?thumb=1`}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.visibility = 'hidden';
                  }}
                />
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] text-white">
                  {fmtDuration(clip.duration)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`line-clamp-2 text-sm font-medium ${
                      active ? 'text-amber' : 'text-white/90'
                    }`}
                  >
                    {clip.title}
                  </p>
                  <ScoreBadge score={clip.score} />
                </div>
                {!clip.ready && (
                  <span className="mt-1 inline-block text-[10px] text-white/40">
                    rendering…
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
