'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'file' | 'youtube'

export default function UploadZone() {
  const [tab, setTab] = useState<Tab>('file')
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [ytUrl, setYtUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const maxMB = 2000

  function validateFile(f: File): string {
    const allowed = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/avi', 'video/webm']
    if (!allowed.includes(f.type) && !f.name.match(/\.(mp4|mov|mkv|avi|webm)$/i)) {
      return 'Please upload a video file (MP4, MOV, MKV, AVI, or WEBM)'
    }
    if (f.size > maxMB * 1024 * 1024) {
      return `File too large. Maximum size is ${maxMB}MB`
    }
    return ''
  }

  function validateYtUrl(url: string): string {
    const yt = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/
    if (!yt.test(url)) return 'Masukkan link YouTube yang valid'
    return ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) selectFile(dropped)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) selectFile(selected)
  }

  function selectFile(f: File) {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError('')
    setFile(f)
  }

  async function handleUploadFile() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('video', file)
      const res = await fetch('/api/jobs', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      router.push(`/jobs/${data.jobId}`)
    } catch (err: unknown) {
      setError((err as Error).message)
      setUploading(false)
    }
  }

  async function handleYoutube() {
    const err = validateYtUrl(ytUrl)
    if (err) { setError(err); return }
    setUploading(true)
    setError('')
    try {
      const res = await fetch('/api/jobs/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ytUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengambil video')
      router.push(`/jobs/${data.jobId}`)
    } catch (err: unknown) {
      setError((err as Error).message)
      setUploading(false)
    }
  }

  function formatSize(bytes: number): string {
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Tab switcher */}
      <div className="flex bg-[#141414] rounded-xl p-1 border border-white/10">
        <button
          onClick={() => { setTab('file'); setError('') }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'file' ? 'bg-amber-500 text-black' : 'text-white/50 hover:text-white'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => { setTab('youtube'); setError('') }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            tab === 'youtube' ? 'bg-red-600 text-white' : 'text-white/50 hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
          </svg>
          Link YouTube
        </button>
      </div>

      {/* File upload */}
      {tab === 'file' && (
        <>
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-amber-400 bg-amber-400/5'
                : file
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-white/20 bg-[#141414] hover:border-amber-400/50 hover:bg-amber-400/5'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*,.mp4,.mov,.mkv,.avi,.webm"
              className="hidden"
              onChange={handleFileChange}
            />
            {!file ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <svg className="w-16 h-16 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-semibold text-white/80">Drop your video here</p>
                  <p className="text-sm text-white/40 mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-white/30">MP4, MOV, MKV, AVI, WEBM · Up to {maxMB/1000}GB</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{file.name}</p>
                  <p className="text-sm text-white/50">{formatSize(file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="text-xs text-white/40 hover:text-white/60 underline"
                >
                  Remove file
                </button>
              </div>
            )}
          </div>

          {file && (
            <button
              onClick={handleUploadFile}
              disabled={uploading}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-black font-bold text-lg rounded-xl transition-colors"
            >
              {uploading ? <Spinner text="Uploading..." /> : 'Generate Clips'}
            </button>
          )}
        </>
      )}

      {/* YouTube URL */}
      {tab === 'youtube' && (
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 text-white/60 text-sm">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
            </svg>
            Paste link video YouTube — akan didownload otomatis lalu diproses
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={ytUrl}
              onChange={(e) => { setYtUrl(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleYoutube()}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-[#0A0A0A] border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-red-500 transition-colors"
            />
            <button
              onClick={handleYoutube}
              disabled={uploading || !ytUrl}
              className="px-5 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-600/40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              {uploading ? <Spinner text="Downloading..." /> : 'Ambil Video'}
            </button>
          </div>

          <p className="text-xs text-white/30">
            Butuh <code className="text-white/50">yt-dlp</code> terinstall di sistem.
            Install: <code className="text-white/50">pip install yt-dlp</code>
          </p>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

function Spinner({ text }: { text: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text}
    </span>
  )
}
