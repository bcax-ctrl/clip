'use client';

import { useRef, useState } from 'react';
import type { Clip } from '@/lib/types';
import SubtitleOverlay, { CaptionStyle } from './SubtitleOverlay';

function fmt(t: number): string {
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoPlayer({
  jobId,
  clip,
}: {
  jobId: string;
  clip: Clip;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(clip.duration);
  const [playing, setPlaying] = useState(false);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('yellow');
  const [showCaptions, setShowCaptions] = useState(true);

  // Preview uses the raw base layer so DOM captions aren't doubled with burned-in.
  const src = `/api/clips/${jobId}/${clip.id}?layer=v2_base`;

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    setTime(v.currentTime);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-2xl bg-black">
        <video
          key={clip.id}
          ref={videoRef}
          src={src}
          className="h-full w-full object-contain"
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
          onClick={toggle}
          playsInline
        />
        {showCaptions && (
          <SubtitleOverlay
            segments={clip.segments}
            time={time}
            style={captionStyle}
          />
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 w-full max-w-[360px]">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
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
            max={duration || clip.duration}
            step={0.1}
            value={time}
            onChange={seek}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-amber"
          />
          <span className="w-12 text-xs tabular-nums text-white/60">
            {fmt(duration || clip.duration)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setShowCaptions((s) => !s)}
            className="btn-ghost text-xs"
          >
            {showCaptions ? 'Captions: On' : 'Captions: Off'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Style</span>
            <button
              onClick={() => setCaptionStyle('yellow')}
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                captionStyle === 'yellow'
                  ? 'bg-amber text-black'
                  : 'bg-surface text-white/60'
              }`}
            >
              Yellow
            </button>
            <button
              onClick={() => setCaptionStyle('redwhite')}
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                captionStyle === 'redwhite'
                  ? 'bg-amber text-black'
                  : 'bg-surface text-white/60'
              }`}
            >
              Red/White
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
