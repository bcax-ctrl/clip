'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ClipSidebar from '@/components/ClipSidebar';
import VideoPlayer from '@/components/VideoPlayer';
import StatusProgress from '@/components/StatusProgress';
import type { JobStatusResponse, Clip } from '@/lib/types';

export default function JobPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 404) setLoadError('Job not found.');
          return;
        }
        const data: JobStatusResponse = await res.json();
        if (cancelled) return;
        setJob(data);
        setActiveId((prev) => prev ?? data.clips.find((c) => c.ready)?.id ?? null);
        if (data.status === 'done' || data.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* transient — keep polling */
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  const activeClip = useMemo<Clip | null>(
    () => job?.clips.find((c) => c.id === activeId) ?? null,
    [job, activeId]
  );

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-lg font-semibold text-red-400">{loadError}</p>
        <Link href="/" className="btn-amber mt-6">
          Upload a video
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="px-6 py-24 text-center text-white/50">Loading…</div>
    );
  }

  const processing =
    job.status !== 'done' && job.status !== 'error';

  return (
    <div>
      {/* Status banner while processing */}
      {(processing || job.status === 'error') && (
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="mb-4">
            <h1 className="text-xl font-bold">{job.fileName}</h1>
            <p className="text-sm text-white/50">Job {jobId.slice(0, 8)}</p>
          </div>
          <StatusProgress
            status={job.status}
            progress={job.progress}
            message={job.message}
          />
          {job.status === 'error' && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              <p className="font-semibold">Processing failed</p>
              <p className="mt-1">{job.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Results workspace */}
      {job.clips.length > 0 && (
        <div className="flex h-[calc(100vh-57px)] border-t border-white/5">
          <ClipSidebar
            jobId={jobId}
            clips={job.clips}
            activeId={activeId}
            onSelect={setActiveId}
          />

          {/* Main video area */}
          <div className="flex flex-1 items-center justify-center overflow-y-auto bg-ink p-8">
            {activeClip ? (
              <VideoPlayer jobId={jobId} clip={activeClip} />
            ) : (
              <p className="text-white/40">Select a clip from the sidebar</p>
            )}
          </div>

          {/* Right detail panel */}
          {activeClip && (
            <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-white/5 bg-ink p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-md bg-amber px-2 py-1 text-xs font-bold text-black">
                  Score {activeClip.score}/10
                </span>
                <span className="text-xs text-white/40">
                  {Math.round(activeClip.duration)}s
                </span>
              </div>

              <h2 className="text-lg font-bold leading-snug">
                {activeClip.title}
              </h2>

              {activeClip.hook && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-white/40">
                    Hook
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    “{activeClip.hook}”
                  </p>
                </div>
              )}

              {activeClip.reason && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-white/40">
                    Why it works
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {activeClip.reason}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <a
                  href={`/api/clips/${jobId}/${activeClip.id}?layer=v11_final&download=1`}
                  className="btn-amber w-full"
                  download
                >
                  ⬇ Download Clip
                </a>
                <Link
                  href={`/compare/${jobId}/${activeClip.id}`}
                  className="btn-ghost w-full"
                >
                  ⇄ Before / After
                </Link>
              </div>

              <p className="mt-6 text-xs text-white/30">
                Time range: {Math.round(activeClip.start)}s –{' '}
                {Math.round(activeClip.end)}s
              </p>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
