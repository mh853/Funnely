// 공개 마케팅 정적 라우트를 나열하는 sitemap.xml 생성 라우트
import { MetadataRoute } from 'next'
import { getAllFeatureSlugs } from '@/data/features'

export default function sitemap(): MetadataRoute.Sitemap {
  const domain = (process.env.NEXT_PUBLIC_DOMAIN || 'https://funnely.co.kr').replace(/\/$/, '')

  // 주의: '/features'는 실제 page.tsx가 없어 제외함 (features/[slug], features/comparison만 존재)
  const staticRoutes = [
    '',
    '/privacy',
    '/terms',
    '/features/comparison',
    '/guides/google-ads',
    '/guides/kakao-moment',
    '/guides/meta-ads',
  ]

  const featureRoutes = getAllFeatureSlugs().map((slug) => `/features/${slug}`)

  return [...staticRoutes, ...featureRoutes].map((route) => ({
    url: `${domain}${route}`,
    lastModified: new Date(),
  }))
}
