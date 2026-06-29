'use client';

import type { JobStatus } from '@/lib/types';

const STEPS: { key: JobStatus; label: string }[] = [
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'clipping', label: 'Clipping' },
  { key: 'done', label: 'Done' },
];

const ORDER: JobStatus[] = [
  'queued',
  'transcribing',
  'analyzing',
  'clipping',
  'done',
];

export default function StatusProgress({
  status,
  progress,
  message,
}: {
  status: JobStatus;
  progress: number;
  message?: string;
}) {
  const currentIdx = ORDER.indexOf(status);

  return (
    <div className="card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-white/70">
          {status === 'error' ? (
            <span className="text-red-400">Error</span>
          ) : (
            <span>{message || 'Working…'}</span>
          )}
        </div>
        <span className="text-sm font-semibold text-amber">{progress}%</span>
      </div>

      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === 'error' ? 'bg-red-500' : 'bg-amber'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const stepIdx = ORDER.indexOf(step.key);
          const reached = currentIdx >= stepIdx && status !== 'error';
          const active = status === step.key;
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${
                  reached
                    ? 'border-amber bg-amber text-black'
                    : 'border-white/15 bg-surface text-white/40'
                } ${active ? 'ring-2 ring-amber/40' : ''}`}
              >
                {reached && !active ? '✓' : i + 1}
              </div>
              <span
                className={`mt-2 text-xs ${
                  reached ? 'text-white' : 'text-white/40'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
