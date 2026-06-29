# ClipMine — AI-Powered Viral Video Clipper

ClipMine takes long-form video, transcribes it with Whisper, uses Claude AI to identify the most viral-worthy moments, and produces polished 9:16 short clips with captions, color grading, and a before/after comparison view.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Use nvm or fnm to manage versions |
| FFmpeg | Any recent | `brew install ffmpeg` / `sudo apt install ffmpeg` |
| Whisper | openai-whisper | `pip install openai-whisper` |
| Anthropic API key | — | [console.anthropic.com](https://console.anthropic.com) |

> **Demo mode**: if you just want to try the UI without FFmpeg or Whisper, set `DEMO_MODE=true` in `.env.local`. The app will use mock transcripts, mock clips, and copy the source file instead of running FFmpeg.

---

## Installation

```bash
git clone https://github.com/your-org/clipmine.git
cd clipmine
npm install
cp .env.local.example .env.local
# Edit .env.local and fill in your values
npm run dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | — | Your Anthropic API key. *Not needed in DEMO_MODE. |
| `WHISPER_MODEL` | No | `base` | Whisper model size: `tiny`, `base`, `small`, `medium`, `large` |
| `UPLOAD_DIR` | No | `/tmp/clipmine` | Directory where uploads and generated clips are stored |
| `MAX_FILE_SIZE_MB` | No | `2000` | Maximum upload size in MB |
| `DEMO_MODE` | No | `false` | Set to `true` to skip Whisper/FFmpeg/Claude and use mock data |

---

## How to Run

**Development**
```bash
npm run dev
# App runs at http://localhost:3000
```

**Production build**
```bash
npm run build
npm start
```

**Type-check only**
```bash
npx tsc --noEmit
```

---

## Features

- **Upload any video** — drag-and-drop or click to select (up to 2 GB by default)
- **Auto-transcription** — Whisper speech-to-text with configurable model size
- **AI clip detection** — Claude identifies the 5–8 most engaging, viral-worthy moments
- **9:16 output** — clips are scaled and padded to portrait format, ready for TikTok/Reels/Shorts
- **11-layer processing pipeline** — raw cut → base → vignette → light leak → grain → two color grades → final with captions
- **Animated captions** — burned-in subtitles synced to the transcript
- **Before/After comparison** — split view and swipe view to compare raw vs. processed
- **Layer switcher** — preview each processing step individually
- **Clip download** — download any clip directly from the browser
- **Demo mode** — run without any external dependencies for UI testing

---

## Folder Structure

```
clipmine/
├── app/
│   ├── api/
│   │   ├── jobs/              # POST (create job), GET (job status)
│   │   │   └── [jobId]/       # GET job by ID
│   │   └── clips/
│   │       └── [jobId]/[clipId]/
│   │           ├── route.ts         # Stream clip video
│   │           ├── thumbnail/       # Serve clip thumbnail
│   │           └── layers/          # List available layer files
│   ├── compare/[jobId]/[clipId]/    # Before/After comparison page
│   ├── jobs/[jobId]/                # Job results page
│   ├── error.tsx                    # Global error boundary
│   ├── loading.tsx                  # Global loading skeleton
│   ├── layout.tsx
│   └── page.tsx                     # Upload / home page
├── components/
│   ├── BeforeAfterPlayer.tsx        # Split/swipe comparison player
│   ├── ClipSidebar.tsx              # Clip list with thumbnails
│   ├── StatusProgress.tsx           # Processing progress bar
│   ├── SubtitleOverlay.tsx          # Animated subtitle renderer
│   ├── UploadZone.tsx               # Drag-and-drop upload
│   └── VideoPlayer.tsx              # Main clip player
├── lib/
│   ├── claude.ts                    # Claude API integration
│   ├── ffmpeg.ts                    # FFmpeg clip generation (fluent-ffmpeg)
│   ├── ffmpegLayers.ts              # Multi-layer FFmpeg pipeline
│   ├── jobQueue.ts                  # In-memory job store
│   ├── types.ts                     # Shared TypeScript types
│   └── whisper.ts                   # Whisper transcription
├── .env.local.example
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```
