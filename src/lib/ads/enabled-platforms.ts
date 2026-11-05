// 이 회사에 열린 광고 연동 플랫폼 목록 (사이드바 '광고 성과' 노출·사용 가이드의 플랫폼 탭에 같이 쓴다)
import { isMetaEnabledForCompany } from './meta'
import { isGoogleAdsEnabledForCompany } from './google'
import { isNaverAdsEnabledForCompany } from './naver'
import { isKakaoAdsEnabledForCompany } from './kakao'

export type AdPlatform = 'meta' | 'google' | 'naver' | 'kakao'

export function getEnabledAdPlatforms(companyId: string | null | undefined): AdPlatform[] {
  return [
    ...(isMetaEnabledForCompany(companyId) ? ['meta' as const] : []),
    ...(isGoogleAdsEnabledForCompany(companyId) ? ['google' as const] : []),
    ...(isNaverAdsEnabledForCompany(companyId) ? ['naver' as const] : []),
    ...(isKakaoAdsEnabledForCompany(companyId) ? ['kakao' as const] : []),
  ]
}
