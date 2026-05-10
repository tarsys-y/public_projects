/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['brapi.dev', 'fundamentus.com.br'],
  },
  async rewrites() {
    return [
      {
        source: '/api/quant/:path*',
        destination: `${process.env.QUANT_SERVICE_URL || 'http://localhost:8000'}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
