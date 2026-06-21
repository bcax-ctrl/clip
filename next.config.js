/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow larger request bodies for direct file uploads via route handlers.
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
};

module.exports = nextConfig;
