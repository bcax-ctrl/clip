'use client'

import { useEffect, useState } from 'react'
import { TranscriptSegment } from '@/lib/types'

type SubtitleStyle = 'yellow' | 'capcut'

interface Props {
  segments: TranscriptSegment[]
  currentTime: number
  clipStart: number
  style: SubtitleStyle
}

export default function SubtitleOverlay({ segments, currentTime, clipStart, style }: Props) {
  const [activeSegment, setActiveSegment] = useState<TranscriptSegment | null>(null)

  useEffect(() => {
    const absoluteTime = currentTime + clipStart
    const segment = segments.find(s => absoluteTime >= s.start && absoluteTime <= s.end) || null
    setActiveSegment(segment)
  }, [currentTime, clipStart, segments])

  if (!activeSegment) return null

  const words = activeSegment.text.trim().split(/\s+/)

  return (
    <div className="absolute bottom-[18%] left-0 right-0 flex justify-center px-4 pointer-events-none">
      {style === 'yellow' ? (
        <p className="text-[22px] font-black uppercase text-center"
          style={{
            color: '#FFD700',
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
            lineHeight: 1.2,
            maxWidth: '85%',
          }}>
          {activeSegment.text}
        </p>
      ) : (
        <p className="text-[22px] font-black uppercase text-center"
          style={{
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000',
            lineHeight: 1.2,
            maxWidth: '85%',
          }}>
          {words.map((word, i) => (
            <span key={i} style={{ color: i % 2 === 0 ? '#FFFFFF' : '#FF3B30' }}>
              {word}{i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
