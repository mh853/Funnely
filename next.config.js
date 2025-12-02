/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 컴파일러 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // SWC 최적화 (기본값이지만 명시적으로)
  swcMinify: true,

  // 프로덕션 빌드 최적화
  poweredByHeader: false, // X-Powered-By 헤더 제거

  // Vercel은 자체 최적화 배포를 사용하므로 standalone 불필요
  // output: 'standalone', // Docker/자체 서버 배포 시에만 사용

  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // 최신 이미지 포맷 지원
    formats: ['image/avif', 'image/webp'],
    // 이미지 최적화 설정
    minimumCacheTTL: 31536000, // 1년 캐싱
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 실험적 기능으로 성능 개선
  experimental: {
    // optimizeCss는 critters 패키지가 필요하므로 제거
    // optimizeCss: true,
    optimizePackageImports: [
      '@heroicons/react',
      '@supabase/supabase-js',
      'recharts',
      'lucide-react',
      '@headlessui/react',
    ],
    // Server Actions 최적화
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // 압축 활성화
  compress: true,

  // HTTP 헤더 최적화
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
      {
        source: '/landing/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
    ]
  },
};

module.exports = nextConfig;
