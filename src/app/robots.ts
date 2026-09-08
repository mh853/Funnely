// 검색엔진 크롤러 접근 규칙을 정의하는 robots.txt 생성 라우트
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const domain = (process.env.NEXT_PUBLIC_DOMAIN || 'https://funnely.co.kr').replace(/\/$/, '')

  return {
    // /auth, /dashboard, /admin은 robots.txt로 막지 않는다 - 크롤링을 막으면
    // 각 layout의 meta robots noindex를 구글이 읽지 못해, 외부 링크가 있을 경우
    // URL만 색인되는 케이스가 생긴다. 크롤링은 허용하고 noindex로 색인을 막는다(노션 35번).
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api'],
    },
    sitemap: `${domain}/sitemap.xml`,
  }
}
