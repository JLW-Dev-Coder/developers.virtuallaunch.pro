import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Output static export not needed — deploying to Cloudflare Pages with Next.js adapter
  // or standard Node deployment
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
