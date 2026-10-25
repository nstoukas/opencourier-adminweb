/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['backend-admin-sdk'],
  experimental: {
    // Phosphor ships every icon (in six weights) behind one index file. Without this, each
    // page compiles all ~4,500 of those modules to use a handful; with it, Next rewrites
    // `import { X } from '@phosphor-icons/react'` to load only the icons a file names.
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
}

module.exports = nextConfig
