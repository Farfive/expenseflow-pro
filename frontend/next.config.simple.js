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
};

module.exports = nextConfig; 