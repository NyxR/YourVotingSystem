import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dcenkbtbsurxqwpkosxy.supabase.co',
      },
    ],
  },
  // The dev-only "N" indicator defaults to bottom-left, on top of the
  // sidebar's user avatar. Keep it out of the way.
  devIndicators: { position: 'bottom-right' },
  experimental: {
    serverActions: {
      // Receipts are capped at 5 MB; leave headroom for the other form fields.
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
