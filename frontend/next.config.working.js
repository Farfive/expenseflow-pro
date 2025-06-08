/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential for finding pages in src/app directory
  experimental: {
    appDir: true,
  },
  
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
  
  // Basic environment
  env: {
    NEXT_PUBLIC_APP_NAME: 'ExpenseFlow Pro',
    NEXT_PUBLIC_API_URL: 'http://localhost:3002',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
  
  // Simple API proxy
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3002/api/:path*',
      },
    ];
  },
  
  // Disable optimizations that can cause startup delays
  compress: false,
  poweredByHeader: false,
  generateEtags: false,
  
  // Ensure proper source directory detection
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Fast refresh settings
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/
      };
    }
    return config;
  }
};

module.exports = nextConfig; 