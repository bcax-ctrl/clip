'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface BeforeAfterPlayerProps {
  rawSrc: string; // URL to clip_v1_raw.mp4 ("Before")
  processedSrc: string; // URL to selected processed layer ("After")
  mode: 'split' | 'swipe';
  synced?: boolean;
}

function fmt(t: number): string {
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function BeforeAfterPlayer({
  rawSrc,
  processedSrc,
  mode,
  synced = true,
}: BeforeAfterPlayerProps) {
  const afterRef = useRef<HTMLVideoElement>(null);
  const beforeRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [divider, setDivider] = useState(50); // % for swipe mode
  const dragging = useRef(false);

  const syncBefore = useCallback(() => {
    if (!synced) return;
    const a = afterRef.current;
    const b = beforeRef.current;
    if (!a || !b) return;
    if (Math.abs(a.currentTime - b.currentTime) > 0.15) {
      b.currentTime = a.currentTime;
    }
  }, [synced]);

  const togglePlay = useCallback(() => {
    const a = afterRef.current;
    const b = beforeRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      if (synced && b) void b.play();
      setPlaying(true);
    } else {
      a.pause();
      if (b) b.pause();
      setPlaying(false);
    }
  }, [synced]);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = afterRef.current;
    const b = beforeRef.current;
    const t = Number(e.target.value);
    if (a) a.currentTime = t;
    if (synced && b) b.currentTime = t;
    setTime(t);
  };

  // Swipe divider drag handlers.
  useEffect(() => {
    const onMove = (clientX: number) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setDivider(Math.max(0, Math.min(100, pct)));
    };
    const mouseMove = (e: MouseEvent) => onMove(e.clientX);
    const touchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const stop = () => (dragging.current = false);

    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('touchmove', touchMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };
  }, []);

  const Label = ({ children }: { children: string }) => (
    <span className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-black/70 px-3 py-1 text-sm font-bold uppercase tracking-wide text-white">
      {children}
    </span>
  );

  if (mode === 'split') {
    return (
      <div className="w-full">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
            <Label>After</Label>
            <video
              ref={afterRef}
              src={processedSrc}
              className="h-full w-full object-contain"
              onTimeUpdate={(e) => {
                setTime(e.currentTarget.currentTime);
                syncBefore();
              }}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setPlaying(false)}
              playsInline
            />
          </div>
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
            <Label>Before</Label>
            <video
              ref={beforeRef}
              src={rawSrc}
              className="h-full w-full object-contain"
              muted
              playsInline
            />
          </div>
        </div>
        <Controls
          playing={playing}
          time={time}
          duration={duration}
          onToggle={togglePlay}
          onSeek={seek}
        />
      </div>
    );
  }

  // Swipe mode — single stacked panel with a draggable divider.
  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-xl bg-black select-none"
      >
        {/* Before (full, underneath) */}
        <video
          ref={beforeRef}
          src={rawSrc}
          className="absolute inset-0 h-full w-full object-contain"
          muted
          playsInline
        />
        <span className="absolute right-3 top-3 z-10 rounded-md bg-black/70 px-3 py-1 text-sm font-bold uppercase text-white">
          Before
        </span>

        {/* After (clipped from the left) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - divider}% 0 0)` }}
        >
          <video
            ref={afterRef}
            src={processedSrc}
            className="absolute inset-0 h-full w-full object-contain"
            onTimeUpdate={(e) => {
              setTime(e.currentTarget.currentTime);
              syncBefore();
            }}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => setPlaying(false)}
            playsInline
          />
        </div>
        <span className="absolute left-3 top-3 z-10 rounded-md bg-black/70 px-3 py-1 text-sm font-bold uppercase text-white">
          After
        </span>

        {/* Divider handle */}
        <div
          className="absolute top-0 z-20 h-full w-0.5 cursor-ew-resize bg-amber"
          style={{ left: `${divider}%` }}
          onMouseDown={() => (dragging.current = true)}
          onTouchStart={() => (dragging.current = true)}
        >
          <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber text-xs font-bold text-black">
            ↔
          </div>
        </div>
      </div>
      <Controls
        playing={playing}
        time={time}
        duration={duration}
        onToggle={togglePlay}
        onSeek={seek}
      />
    </div>
  );
}

function Controls({
  playing,
  time,
  duration,
  onToggle,
  onSeek,
}: {
  playing: boolean;
  time: number;
  duration: number;
  onToggle: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        onClick={onToggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber text-black"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <span className="w-12 text-right text-xs tabular-nums text-white/60">
        {fmt(time)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={time}
        onChange={onSeek}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-amber"
      />
      <span className="w-12 text-xs tabular-nums text-white/60">
        {fmt(duration)}
      </span>
    </div>
  );
}
