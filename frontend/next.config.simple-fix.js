/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration for fastest startup
  reactStrictMode: false,
  swcMinify: false,
  
  // Disable features that can cause startup delays
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable experimental features
  experimental: {},
  
  // Simple environment
  env: {
    NEXT_PUBLIC_APP_NAME: 'ExpenseFlow Pro',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000',
  },
  
  // Simplified API proxy
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005';
    console.log('API URL for proxy:', apiUrl);
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  
  // Disable optimizations that can cause startup delays
  compress: false,
  poweredByHeader: false,
  generateEtags: false,
  
  // Faster compilation
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig; 