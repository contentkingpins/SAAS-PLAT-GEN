/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  // Skip data collection during build if no DATABASE_URL
  experimental: {
    outputFileTracingRoot: undefined,
  },
  // Disable static optimization for API routes during build
  ...(process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL ? {
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
  } : {})
};

module.exports = nextConfig;
