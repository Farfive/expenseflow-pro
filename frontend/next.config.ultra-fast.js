/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ultra-fast development configuration
  reactStrictMode: false,
  swcMinify: false,
  
  // Disable all type checking and linting during development
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable all experimental features
  experimental: {
    // Enable turbo mode for faster compilation
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Minimal environment
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005',
  },
  
  // Simple API proxy
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005'}/api/:path*`,
      },
    ];
  },
  
  // Disable all optimizations for faster dev
  compress: false,
  poweredByHeader: false,
  generateEtags: false,
  
  // Ultra-fast webpack configuration
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable source maps for faster compilation
      config.devtool = false;
      
      // Faster file watching
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
      
      // Reduce bundle splitting for faster compilation
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Single vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
            },
          },
        },
      };
      
      // Faster module resolution
      config.resolve.symlinks = false;
      config.resolve.cacheWithContext = false;
      
      // Exclude heavy dependencies from compilation
      config.externals = config.externals || [];
      if (!isServer) {
        config.externals.push({
          'react-pdf': 'react-pdf',
          'tesseract.js': 'tesseract.js',
          'jimp': 'jimp',
        });
      }
    }
    
    return config;
  },
  
  // Disable image optimization for faster dev
  images: {
    unoptimized: true,
  },
  
  // Faster page compilation
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig; 