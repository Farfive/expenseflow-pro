/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration for fastest startup
  reactStrictMode: false,
  swcMinify: false,
  
  // Disable complex features that slow startup
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Speed optimizations
  experimental: {
    optimizeCss: false,
    optimizePackageImports: [],
  },
  
  // Basic environment with consistent ports
  env: {
    NEXT_PUBLIC_APP_NAME: 'ExpenseFlow Pro',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000',
    PORT: process.env.PORT || '4000',
  },
  
  // Simple API proxy with error handling
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  
  // Handle API proxy errors gracefully
  async redirects() {
    return [];
  },
  
  // Disable optimizations that can cause startup delays
  compress: false,
  poweredByHeader: false,
  generateEtags: false,
  
  // Ensure proper source directory detection
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Better error handling
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig; 