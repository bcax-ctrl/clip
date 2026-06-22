# ClipForge — container with everything baked in: Node + ffmpeg + Whisper + yt-dlp.
# Build: docker build -t clipforge .
# Run:   docker run -p 3000:3000 clipforge
FROM node:22-slim

# --- System deps: ffmpeg (render) + python (whisper/yt-dlp) ---
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      python3 \
      python3-pip \
      fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# --- Python tools: CPU-only torch (smaller), Whisper, yt-dlp ---
# Installing the CPU wheel keeps the image far smaller than the default CUDA build.
RUN pip3 install --break-system-packages --no-cache-dir \
      --index-url https://download.pytorch.org/whl/cpu torch \
 && pip3 install --break-system-packages --no-cache-dir \
      openai-whisper yt-dlp

WORKDIR /app

# --- Node deps (cached layer) ---
COPY package.json package-lock.json ./
RUN npm ci

# --- App source + production build ---
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Whisper model: tiny|base|small|medium. tiny/base recommended on low-RAM hosts.
ENV WHISPER_MODEL=base
# Pre-cache the Whisper model into the image so first transcription is instant
# and does not need to download at runtime. Comment out to slim the image.
RUN python3 -c "import whisper; whisper.load_model('base')"

EXPOSE 3000
# Railway/Render inject $PORT; Next.js honors it. Fallback to 3000 locally.
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000}"]
