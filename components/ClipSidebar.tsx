'use client'

import { useState } from 'react'
import { Clip } from '@/lib/types'
import Link from 'next/link'

interface Props {
  clips: Clip[]
  activeClipId: string | null
  jobId: string
  onSelect: (clip: Clip) => void
  isProcessing?: boolean
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-red-500' : score >= 6 ? 'bg-amber-500' : 'bg-white/20'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold text-white ${color}`}>
      {score.toFixed(0)}/10
    </span>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function SkeletonCard() {
  return (
    <div className="flex gap-3 p-2 rounded-xl bg-white/5 animate-pulse flex-shrink-0 md:flex-shrink">
      <div className="w-16 h-24 rounded-lg bg-white/10 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2 py-1">
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="h-5 w-12 rounded bg-white/5" />
        <div className="h-3 w-full rounded bg-white/5" />
      </div>
    </div>
  )
}

function ClipThumbnail({ clip }: { clip: Clip }) {
  const [imgError, setImgError] = useState(false)

  if (clip.thumbnailUrl && !imgError) {
    return (
      <img
        src={clip.thumbnailUrl}
        alt={clip.title}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    )
  }

  if (imgError || !clip.thumbnailUrl) {
    // Fallback: colored div with viral score
    const bg = clip.score >= 8 ? 'bg-red-900/60' : clip.score >= 6 ? 'bg-amber-900/60' : 'bg-zinc-800'
    return (
      <div className={`w-full h-full flex items-center justify-center ${bg}`}>
        <span className="text-2xl font-black text-white/80">{clip.score}</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-white/5">
      <svg className="w-6 h-6 text-white/20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  )
}

export default function ClipSidebar({ clips, activeClipId, jobId, onSelect, isProcessing }: Props) {
  const showSkeletons = clips.length === 0 && isProcessing

  return (
    <div className="
      md:w-[280px] md:flex-shrink-0 md:flex-col md:h-full md:overflow-hidden
      flex-shrink-0 bg-[#141414] border-r border-white/10
      flex flex-col
    ">
      <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
        <h2 className="font-semibold text-white/80 text-sm uppercase tracking-wider">
          Generated Clips
          <span className="ml-2 text-amber-400">({clips.length})</span>
        </h2>
      </div>

      {/* On mobile: horizontal scrolling strip. On md+: vertical scrolling list */}
      <div className="
        flex md:flex-col
        overflow-x-auto md:overflow-x-hidden md:overflow-y-auto
        flex-1 md:flex-auto
        gap-2 md:gap-0
        p-2 md:p-0
      ">
        {showSkeletons ? (
          <div className="flex md:flex-col gap-2 p-2 md:p-2 md:space-y-1">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : clips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full w-full text-center px-4 py-12 min-w-[240px]">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-white/30">Clips will appear here once generated</p>
          </div>
        ) : (
          <div className="flex md:flex-col gap-1 md:p-2">
            {clips.map((clip) => {
              const isActive = clip.id === activeClipId
              return (
                <button
                  key={clip.id}
                  onClick={() => onSelect(clip)}
                  className={`flex-shrink-0 md:flex-shrink md:w-full text-left rounded-xl overflow-hidden transition-all duration-150 group ${
                    isActive
                      ? 'ring-2 ring-amber-400 bg-amber-400/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex gap-3 p-2">
                    <div className="w-16 h-24 bg-black rounded-lg overflow-hidden flex-shrink-0 relative">
                      <ClipThumbnail clip={clip} />
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white/80 text-[10px] px-1 rounded">
                        {formatDuration(clip.duration)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 py-1">
                      <p className={`text-sm font-medium leading-tight line-clamp-2 ${isActive ? 'text-amber-300' : 'text-white/80'}`}>
                        {clip.title}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <ScoreBadge score={clip.score} />
                      </div>
                      <p className="mt-1.5 text-xs text-white/40 line-clamp-2">{clip.hook}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {clips.length > 0 && (
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <Link
            href={`/compare/${jobId}/${clips[0]?.id}`}
            className="block text-center text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            View Before/After Comparison
          </Link>
        </div>
      )}
    </div>
  )
}
