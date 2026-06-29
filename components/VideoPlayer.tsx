'use client'

import { useRef, useState, useEffect } from 'react'
import { Clip, TranscriptSegment } from '@/lib/types'
import SubtitleOverlay from './SubtitleOverlay'
import Link from 'next/link'

type SubtitleStyle = 'yellow' | 'capcut'

interface Props {
  clip: Clip
  transcript: TranscriptSegment[]
  jobId: string
}

export default function VideoPlayer({ clip, transcript, jobId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>('yellow')
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [videoError, setVideoError] = useState(false)

  const videoUrl = `/api/clips/${jobId}/${clip.id}?layer=v11_final`

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.load()
    setCurrentTime(0)
    setIsPlaying(false)
    setVideoError(false)
  }, [clip.id])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true) }
    else { v.pause(); setIsPlaying(false) }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative bg-black flex-1 flex items-center justify-center">
        <div className="relative h-full aspect-[9/16] max-h-full">
          {videoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-white/5 rounded-lg">
              <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-white/40 text-sm">Video unavailable</p>
            </div>
          ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            onError={() => setVideoError(true)}
          />

          {showSubtitles && (
            <SubtitleOverlay
              segments={transcript}
              currentTime={currentTime}
              clipStart={clip.start}
              style={subtitleStyle}
            />
          )}

          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-black/70 transition-colors">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#141414] border-t border-white/10 px-4 py-3 space-y-2">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={(e) => {
            const t = Number(e.target.value)
            if (videoRef.current) videoRef.current.currentTime = t
            setCurrentTime(t)
          }}
          className="w-full accent-amber-400"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white/80 hover:text-white">
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="text-xs text-white/40">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <button
                onClick={() => setShowSubtitles(!showSubtitles)}
                className={`px-2 py-1 rounded transition-colors ${showSubtitles ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10'}`}
              >
                CC
              </button>
              {showSubtitles && (
                <select
                  value={subtitleStyle}
                  onChange={(e) => setSubtitleStyle(e.target.value as SubtitleStyle)}
                  className="bg-transparent text-white/60 text-xs border border-white/20 rounded px-1 py-0.5"
                >
                  <option value="yellow">Style A (Yellow)</option>
                  <option value="capcut">Style B (CapCut)</option>
                </select>
              )}
            </div>

            <a
              href={videoUrl}
              download={`${clip.title}.mp4`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>

            <Link
              href={`/compare/${jobId}/${clip.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium rounded-lg transition-colors"
            >
              Before/After
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
