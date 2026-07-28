// 검색엔진 크롤러 접근 규칙을 정의하는 robots.txt 생성 라우트
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const domain = (process.env.NEXT_PUBLIC_DOMAIN || 'https://funnely.co.kr').replace(/\/$/, '')

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/api', '/auth'],
    },
    sitemap: `${domain}/sitemap.xml`,
  }
}
