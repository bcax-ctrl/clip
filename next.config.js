/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow larger request bodies for direct file uploads via route handlers.
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  // We spawn ffmpeg/whisper/yt-dlp via child_process from route handlers,
  // so keep them out of the bundle.
  serverExternalPackages: [],
};

module.exports = nextConfig;
