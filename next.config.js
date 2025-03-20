/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['undici', 'firebase', '@firebase/auth'],
  webpack: (config, { isServer }) => {
    // Fix for undici private class fields
    config.module.rules.push({
      test: /node_modules[\\\/](?:.*[\\\/])?undici[\\\/]lib[\\\/].*\.js$/,
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env'],
        plugins: ['@babel/plugin-transform-private-methods', '@babel/plugin-transform-class-properties']
      }
    });
    
    return config;
  }
};

module.exports = nextConfig; 