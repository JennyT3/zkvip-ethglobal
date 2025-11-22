import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['static.usernames.app-backend.toolsforhumanity.com'],
  },
  allowedDevOrigins: ['*'], // Add your dev origin here
  reactStrictMode: false,
  webpack: (config, { isServer, webpack }) => {
    // Adiciona polyfills para Buffer e outros módulos Node.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Adiciona Buffer como global
    try {
      const bufferPath = require.resolve('buffer');
      config.resolve.alias = {
        ...config.resolve.alias,
        buffer: bufferPath,
      };
      
      // Define global para compatibilidade
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
      
      // Define global como globalThis (similar ao Vite)
      config.plugins.push(
        new webpack.DefinePlugin({
          'global': 'globalThis',
        })
      );
    } catch (e) {
      // Buffer não disponível, ignora
      console.warn('Buffer polyfill não disponível:', e);
    }
    
    return config;
  },
};

export default nextConfig;
