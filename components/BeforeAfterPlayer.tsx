'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { LAYER_LABELS, LayerKey } from '@/lib/types'

interface BeforeAfterPlayerProps {
  rawSrc: string
  processedSrc: string
  mode: 'split' | 'swipe'
  jobId: string
  clipId: string
  availableLayers: Record<string, string>
  selectedLayer: string
  onLayerChange: (layer: string) => void
}

export default function BeforeAfterPlayer({
  rawSrc,
  processedSrc,
  mode,
  jobId,
  clipId,
  availableLayers,
  selectedLayer,
  onLayerChange,
}: BeforeAfterPlayerProps) {
  const beforeRef = useRef<HTMLVideoElement>(null)
  const afterRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [synced, setSynced] = useState(true)
  const [swipePos, setSwipePos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const syncVideos = useCallback((time: number) => {
    if (!synced) return
    const before = beforeRef.current
    const after = afterRef.current
    if (before && Math.abs(before.currentTime - time) > 0.3) before.currentTime = time
    if (after && Math.abs(after.currentTime - time) > 0.3) after.currentTime = time
  }, [synced])

  function togglePlay() {
    const before = beforeRef.current
    const after = afterRef.current
    if (!before) return

    if (before.paused) {
      before.play()
      if (synced && after) after.play()
      setIsPlaying(true)
    } else {
      before.pause()
      if (after) after.pause()
      setIsPlaying(false)
    }
  }

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const t = (e.target as HTMLVideoElement).currentTime
    setCurrentTime(t)
    if (synced) syncVideos(t)
  }

  function handleSwipeMouseDown(e: React.MouseEvent) {
    isDragging.current = true
    e.preventDefault()
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      setSwipePos(Math.min(95, Math.max(5, x)))
    }
    function handleMouseUp() { isDragging.current = false }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const layerOptions = Object.entries(availableLayers)
  const sortOrder = ['v1_raw','v2_base','v4_bottomvignette','v5_vignette','v6_lightleak','v7_dust','v8_grain','v9_grade1','v10_grade2','v11_final']
  layerOptions.sort((a, b) => sortOrder.indexOf(a[0]) - sortOrder.indexOf(b[0]))

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">After Layer:</span>
          <select
            value={selectedLayer}
            onChange={(e) => onLayerChange(e.target.value)}
            className="bg-[#141414] border border-white/20 rounded-lg text-sm text-white px-3 py-1.5"
          >
            {layerOptions.map(([key]) => (
              <option key={key} value={key}>{LAYER_LABELS[key] || key}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setSynced(!synced)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            synced ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/10 text-white/60 border border-white/20'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {synced ? 'Synced' : 'Unsynced'}
        </button>
      </div>

      <div ref={containerRef} className="flex-1 relative bg-black rounded-xl overflow-hidden">
        {mode === 'split' ? (
          <div className="flex h-full gap-0.5">
            <div className="flex-1 relative">
              <span className="absolute top-3 left-3 z-10 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">
                BEFORE (Raw)
              </span>
              <video
                ref={beforeRef}
                src={rawSrc}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
                playsInline
              />
            </div>
            <div className="flex-1 relative">
              <span className="absolute top-3 left-3 z-10 bg-amber-500/80 text-black text-xs font-bold px-2 py-1 rounded">
                AFTER ({LAYER_LABELS[selectedLayer] || selectedLayer})
              </span>
              <video
                ref={afterRef}
                src={processedSrc}
                className="w-full h-full object-contain"
                onTimeUpdate={(e) => { if (synced) return; setCurrentTime((e.target as HTMLVideoElement).currentTime) }}
                playsInline
                muted
              />
            </div>
          </div>
        ) : (
          <div className="relative h-full select-none">
            <video
              ref={afterRef}
              src={processedSrc}
              className="absolute inset-0 w-full h-full object-contain"
              playsInline
              muted
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - swipePos}% 0 0)` }}
            >
              <video
                ref={beforeRef}
                src={rawSrc}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                onEnded={() => setIsPlaying(false)}
                playsInline
              />
            </div>

            <div
              className="absolute top-0 bottom-0 w-1 bg-amber-400 cursor-ew-resize z-20 flex items-center justify-center"
              style={{ left: `${swipePos}%`, transform: 'translateX(-50%)' }}
              onMouseDown={handleSwipeMouseDown}
            >
              <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
                </svg>
              </div>
            </div>

            <span className="absolute top-3 left-3 z-10 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">BEFORE</span>
            <span className="absolute top-3 right-3 z-10 bg-amber-500/80 text-black text-xs font-bold px-2 py-1 rounded">AFTER</span>
          </div>
        )}
      </div>

      <div className="bg-[#141414] rounded-xl border border-white/10 px-4 py-3 space-y-2">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={(e) => {
            const t = Number(e.target.value)
            setCurrentTime(t)
            if (beforeRef.current) beforeRef.current.currentTime = t
            if (afterRef.current && synced) afterRef.current.currentTime = t
          }}
          className="w-full accent-amber-400"
        />
        <div className="flex items-center justify-between">
          <button onClick={togglePlay} className="flex items-center gap-2 text-white/80 hover:text-white">
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            <span className="text-xs text-white/40">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </button>

          <button
            onClick={() => {
              const url = window.location.href
              navigator.clipboard.writeText(url)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white/70 text-xs rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Link
          </button>
        </div>
      </div>
    </div>
  )
}
