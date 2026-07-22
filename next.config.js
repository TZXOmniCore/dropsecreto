/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.shopee.com.br' },
      { protocol: 'https', hostname: 'cf.shopee.com.br' },
    ],
  },
};

module.exports = nextConfig;
