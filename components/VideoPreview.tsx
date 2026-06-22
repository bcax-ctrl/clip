"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { FilterLook, SubtitleStyleId, Transcript } from "@/lib/types";
import {
  buildCaptionLines,
  activeLine,
  activeWordIndex,
  CaptionLine,
} from "@/lib/captions";

/** Imperative controls exposed to the editor (for keyboard shortcuts). */
export interface VideoPreviewHandle {
  toggle: () => void;
  seek: (t: number) => void;
  getTime: () => number;
}

interface Props {
  src: string;
  transcript: Transcript | null;
  style: SubtitleStyleId;
  cropOffset: number; // -1..1
  hookText: string;
  hookDuration: number;
  /** clip range (source seconds) for looped preview; defaults to full video. */
  clipStart?: number;
  clipEnd?: number;
  onTime?: (t: number) => void;
  onDuration?: (d: number) => void;
  /** viral effects preview */
  look?: FilterLook;
  progressBar?: boolean;
  endCta?: { text: string; durationSec: number } | null;
}

const LOOK_CSS: Record<FilterLook, string> = {
  none: "none",
  vivid: "saturate(1.45) contrast(1.12) brightness(1.02)",
  warm: "saturate(1.2) sepia(0.18)",
  cool: "saturate(1.15) hue-rotate(-12deg)",
  mono: "grayscale(1) contrast(1.15)",
};

const VideoPreview = forwardRef<VideoPreviewHandle, Props>(function VideoPreview(
  {
    src,
    transcript,
    style,
    cropOffset,
    hookText,
    hookDuration,
    clipStart,
    clipEnd,
    look,
    progressBar,
    endCta,
    onTime,
    onDuration,
  },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    toggle: () => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) v.play().catch(() => {});
      else v.pause();
    },
    seek: (t: number) => {
      if (videoRef.current) videoRef.current.currentTime = t;
    },
    getTime: () => videoRef.current?.currentTime ?? 0,
  }));
  const [time, setTime] = useState(0);
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const rangeRef = useRef({ start: clipStart ?? 0, end: clipEnd ?? Infinity });
  rangeRef.current = {
    start: clipStart ?? 0,
    end: clipEnd && clipEnd > 0 ? clipEnd : Infinity,
  };

  useEffect(() => {
    setLines(transcript ? buildCaptionLines(transcript, style) : []);
  }, [transcript, style]);

  // rAF loop for smooth word-level sync + clip-range looping.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        const { start, end } = rangeRef.current;
        // Loop playback within the selected clip range.
        if (!v.paused && v.currentTime >= end) v.currentTime = start;
        setTime(v.currentTime);
        onTime?.(v.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onTime]);

  const playClip = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = rangeRef.current.start;
    v.play().catch(() => {});
  };

  const objX = ((cropOffset + 1) / 2) * 100; // 0..100%
  const line = activeLine(lines, time);
  const hookStart = clipStart ?? 0;
  const showHook =
    !!hookText.trim() &&
    time >= hookStart &&
    time < hookStart + hookDuration;

  // Viral effects preview math
  const clipS = clipStart ?? 0;
  const clipE = clipEnd && clipEnd > 0 ? clipEnd : Infinity;
  const clipDur = Number.isFinite(clipE) ? clipE - clipS : 0;
  const barFrac =
    clipDur > 0 ? Math.min(1, Math.max(0, (time - clipS) / clipDur)) : 0;
  const ctaN = endCta?.durationSec ?? 0;
  const ctaStart = Number.isFinite(clipE) ? clipE - ctaN : Infinity;
  const showCta =
    !!endCta?.text?.trim() && ctaN > 0 && time >= ctaStart && time <= clipE;

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-ink-500 bg-black shadow-glow">
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          onLoadedMetadata={(e) => onDuration?.(e.currentTarget.duration)}
          className="absolute inset-0 h-full w-full"
          style={{
            objectFit: "cover",
            objectPosition: `${objX}% 50%`,
            filter: LOOK_CSS[look ?? "none"],
          }}
        />

        {/* Hook overlay (first N seconds) */}
        {showHook && (
          <div className="pointer-events-none absolute inset-x-0 top-[14%] flex justify-center px-4">
            <div className="animate-[fadein_0.4s_ease] rounded-xl bg-black/60 px-4 py-2 text-center text-xl font-extrabold leading-tight text-white">
              {hookText}
            </div>
          </div>
        )}

        {/* End CTA overlay (last N seconds) */}
        {showCta && (
          <div className="pointer-events-none absolute inset-x-0 top-[42%] flex justify-center px-4">
            <div className="animate-[fadein_0.4s_ease] rounded-xl bg-brand/90 px-4 py-2 text-center text-lg font-extrabold leading-tight text-white">
              {endCta?.text}
            </div>
          </div>
        )}

        {/* Subtitle overlay */}
        {line && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[12%] flex justify-center px-3">
            <CaptionRender line={line} style={style} time={time} />
          </div>
        )}

        {/* Retention progress bar */}
        {progressBar && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-white/20">
            <div
              className="h-full bg-brand"
              style={{ width: `${barFrac * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          onClick={playClip}
          className="rounded-lg bg-ink-500 px-3 py-1.5 text-xs font-semibold hover:bg-ink-400"
        >
          ▶ Putar clip
        </button>
      </div>

      <p className="mt-1.5 text-center text-xs text-zinc-500">
        Preview perkiraan — hasil burn final dirender via ffmpeg/libass.
      </p>

      <style jsx>{`
        @keyframes fadein {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});

export default VideoPreview;

function CaptionRender({
  line,
  style,
  time,
}: {
  line: CaptionLine;
  style: SubtitleStyleId;
  time: number;
}) {
  if (style === "clean") {
    return (
      <span className="rounded-lg bg-black/70 px-3 py-1.5 text-center text-sm font-semibold text-white">
        {line.text}
      </span>
    );
  }

  if (style === "hormozi") {
    return (
      <span
        className="text-center text-2xl font-black uppercase leading-none text-[#FFD400]"
        style={{ WebkitTextStroke: "2px black", letterSpacing: "0.02em" }}
      >
        {line.text}
      </span>
    );
  }

  // karaoke: highlight the active word
  const active = activeWordIndex(line, time);
  return (
    <span
      className="text-center text-xl font-extrabold leading-tight text-white"
      style={{ textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}
    >
      {line.words.map((w, i) => (
        <span
          key={i}
          className="transition-all"
          style={
            i === active
              ? {
                  color: "#FFE600",
                  display: "inline-block",
                  transform: "scale(1.15)",
                }
              : undefined
          }
        >
          {w.text}
          {i < line.words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
