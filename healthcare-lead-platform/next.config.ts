import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output configuration for AWS Amplify
  output: 'standalone',
  
  // Optimize images for Amplify
  images: {
    unoptimized: true,
  },
  
  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
  // Disable x-powered-by header for security
  poweredByHeader: false,
  
  // Enable compression
  compress: true,
  
  // Trailing slash for better static hosting
  trailingSlash: true,
  
  // Add any custom headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
