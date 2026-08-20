import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // TypeScript build errors now block the build (the type gate is re-enabled).
  // ESLint stays out of the build gate for now — the codebase intentionally uses
  // `as any` for Supabase joins; lint runs in CI as non-blocking instead.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  transpilePackages: ['lucide-react'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
