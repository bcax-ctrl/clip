/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow large file uploads through the API routes.
  experimental: {
    serverComponentsExternalPackages: ['fluent-ffmpeg'],
  },
  // fluent-ffmpeg is a server-only dependency; keep it out of the client bundle.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
