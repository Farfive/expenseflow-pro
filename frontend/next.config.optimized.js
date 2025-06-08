/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep React strict mode but optimize for speed
  reactStrictMode: true,
  swcMinify: true, // Use SWC for faster minification
  
  // Optimize TypeScript and ESLint for speed
  typescript: {
    // Keep type checking but make it faster
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    // Keep linting but optimize
    ignoreDuringBuilds: false,
    dirs: ['src', 'pages', 'components'], // Only lint specific directories
  },
  
  // Enable experimental features for speed
  experimental: {
    // Enable Turbo mode (fastest compilation)
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    // Enable SWC plugins for faster compilation
    swcPlugins: [],
    // Optimize package imports
    optimizePackageImports: [
      '@heroicons/react',
      '@headlessui/react',
      'lucide-react',
      'framer-motion',
      'react-query',
      '@tanstack/react-query',
    ],
    // Enable faster refresh
    esmExternals: true,
    // Optimize server components
    serverComponentsExternalPackages: ['sharp', 'jimp'],
  },
  
  // Environment with all your existing variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'ExpenseFlow Pro',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000',
    PORT: process.env.PORT || '4000',
  },
  
  // Optimized API proxy
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  
  // Keep redirects optimized
  async redirects() {
    return [];
  },
  
  // Optimize for development speed while keeping features
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Ultra-optimized webpack configuration for FULL app
  webpack: (config, { dev, isServer, webpack }) => {
    if (dev) {
      // Faster source maps for development
      config.devtool = 'eval-cheap-module-source-map';
      
      // Optimize file watching
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      };
      
      // Optimize module resolution
      config.resolve.symlinks = false;
      config.resolve.cacheWithContext = false;
      
      // Enable persistent caching
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: '.next/cache/webpack',
      };
      
      // Optimize chunk splitting for faster compilation
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
            // Separate heavy libraries
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
              priority: 10,
            },
            reactQuery: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/,
              name: 'react-query',
              chunks: 'all',
              priority: 10,
            },
            ui: {
              test: /[\\/]node_modules[\\/](@headlessui|@heroicons|lucide-react)[\\/]/,
              name: 'ui-libs',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };
      
      // Add webpack plugins for faster compilation
      config.plugins.push(
        new webpack.DefinePlugin({
          __DEV__: JSON.stringify(true),
        })
      );
      
      // Optimize heavy dependencies
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use lighter alternatives in development
        'react-pdf': false,
        'tesseract.js': false,
        'jimp': false,
        'sharp': false,
      };
    }
    
    // Optimize for all environments
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/images/',
          outputPath: 'static/images/',
        },
      },
    });
    
    return config;
  },
  
  // Optimize images but keep functionality
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Optimize page compilation
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  
  // Optimize static generation
  trailingSlash: false,
  
  // Keep all page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Optimize build output
  distDir: '.next',
  
  // Enable compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
    // Optimize React
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig; 