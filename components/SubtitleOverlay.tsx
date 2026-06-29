'use client';

import { useEffect, useState } from 'react';
import type { TranscriptSegment } from '@/lib/types';

export type CaptionStyle = 'yellow' | 'redwhite';

/**
 * DOM-rendered subtitle overlay for the in-browser preview. Subtitles are
 * synced to the <video> element's currentTime via the `time` prop, which the
 * parent updates on `timeupdate`. (Final exports burn captions in with FFmpeg.)
 */
export default function SubtitleOverlay({
  segments,
  time,
  style,
}: {
  segments: TranscriptSegment[];
  time: number;
  style: CaptionStyle;
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    const current = segments.find((s) => time >= s.start && time <= s.end);
    setText(current ? current.text.trim() : '');
  }, [time, segments]);

  if (!text) return null;

  const words = text.toUpperCase().split(/\s+/);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[18%] flex justify-center px-6">
      <p
        className="max-w-[90%] text-center text-2xl font-extrabold uppercase leading-tight md:text-3xl"
        style={
          style === 'yellow'
            ? {
                color: '#FFD700',
                textShadow:
                  '2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000',
              }
            : undefined
        }
      >
        {style === 'redwhite'
          ? words.map((w, i) => (
              <span
                key={i}
                style={{
                  color: i % 2 === 0 ? '#FFFFFF' : '#FF3B3B',
                  textShadow:
                    '2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000',
                  marginRight: '0.35ch',
                }}
              >
                {w}
              </span>
            ))
          : text.toUpperCase()}
      </p>
    </div>
  );
}
