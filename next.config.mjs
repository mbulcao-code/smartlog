/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'book.smartlogtrading.com' }],
          destination: '/book.html',
        },
      ],
    };
  },
};

export default nextConfig;
