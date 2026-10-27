// 퍼널리 카카오 비즈 앱으로 카카오모먼트 API를 호출하는 서버 전용 헬퍼 (비즈니스 인증, 광고계정, 캠페인, 일자별 보고서)

/** 연결 시작 시 심고 콜백에서 비교하는 OAuth state 쿠키 이름 */
export const KAKAO_ADS_OAUTH_STATE_COOKIE = 'kakao_ads_oauth_state'

const MOMENT_BASE = 'https://apis.moment.kakao.com/openapi/v4'
// 조회 전용 동의항목이 없어 최소 권한인 광고계정 운영(moment_management)만 요청한다 (쓰기 API는 호출하지 않는다)
const MOMENT_SCOPE = 'moment_management'

export class KakaoMomentApiError extends Error {
  constructor(message: string, public status?: number, public code?: number, public detailCode?: number) {
    super(message)
  }

  /** 토큰 만료·철회(-401)나 비즈니스 동의 누락(-402) - 고객이 다시 연결해야 한다 */
  get needsReconnect() {
    return this.code === -401 || this.code === -402
  }

  /** 광고계정 권한이 없어짐(-813 안의 상세 코드) - 다시 연결하며 그 계정을 골라야 한다 */
  get noPermission() {
    return this.code === -813 && [101002, 9004, 90003].includes(this.detailCode ?? 0)
  }

  /** 호출 한도 초과 (-10, 또는 HTTP 429로 오는 -813) */
  get rateLimited() {
    return this.code === -10 || this.status === 429
  }
}

function clientId() {
  return process.env.KAKAO_ADS_REST_API_KEY || ''
}

function clientSecret() {
  return process.env.KAKAO_ADS_CLIENT_SECRET || ''
}

/** 퍼널리 카카오 앱 환경변수가 실제 값으로 설정돼 있는지 (placeholder는 미설정 취급) */
export function isKakaoAdsConfigured() {
  const id = clientId()
  const secret = clientSecret()
  return !!id && !!secret && !id.startsWith('your') && !secret.startsWith('your')
}

/**
 * 이 회사에 카카오 광고 성과 기능을 열지. 카카오모먼트 권한 심사·실계정 검증 전에는 KAKAO_ADS_PILOT_COMPANY_IDS
 * (쉼표 구분 회사 id)가 있으면 그 회사에만 보여준다.
 */
export function isKakaoAdsEnabledForCompany(companyId: string | null | undefined) {
  if (!isKakaoAdsConfigured() || !companyId) return false
  const pilot = (process.env.KAKAO_ADS_PILOT_COMPANY_IDS || '').split(',').map((id) => id.trim()).filter(Boolean)
  return pilot.length === 0 || pilot.includes(companyId)
}

/** 카카오 앱 REST API 키에 등록한 비즈니스 인증 리다이렉트 URI와 글자 단위로 같아야 해서 고정 도메인으로 만든다 */
export function getKakaoAdsRedirectUri() {
  const domain = (process.env.NEXT_PUBLIC_DOMAIN || 'https://funnely.co.kr').replace(/\/$/, '')
  return `${domain}/auth/callback/kakao`
}

/** resource_ids를 빼면 동의 화면에서 고객이 연결할 광고계정을 고른다 */
export function buildKakaoAdsAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: getKakaoAdsRedirectUri(),
    response_type: 'code',
    scope: MOMENT_SCOPE,
    state,
  })
  return `https://kauth.kakao.com/oauth/business/authorize?${params.toString()}`
}

export interface KakaoAdsToken {
  accessToken: string
  scope: string
}

/**
 * 인가 코드로 비즈니스 토큰을 받는다. 갱신 토큰·만료 시각이 없고(장기 미사용 시 만료) 발급 개수 제한이 있어
 * 연결 1번에 1번만 받는다.
 */
export async function exchangeCodeForToken(code: string): Promise<KakaoAdsToken> {
  const res = await fetch('https://kauth.kakao.com/oauth/business/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: getKakaoAdsRedirectUri(),
      code,
    }),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.access_token) {
    throw new KakaoMomentApiError(json.error_description || json.error || `카카오 인증 오류 (${res.status})`, res.status)
  }
  return { accessToken: json.access_token, scope: json.scope || '' }
}

export function hasMomentScope(token: KakaoAdsToken) {
  return token.scope.split(/[\s,]+/).includes(MOMENT_SCOPE)
}

function toApiError(json: any, status: number) {
  const message = json?.extras?.detailMsg || json?.msg || `카카오모먼트 API 오류 (${status})`
  return new KakaoMomentApiError(message, status, json?.code, json?.extras?.detailCode)
}

async function kapiFetch(url: string, accessToken: string, adAccountId?: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
  // 계정 단위 API(캠페인·보고서)는 광고계정 번호를 헤더로 보낸다
  if (adAccountId) headers.adAccountId = adAccountId
  const res = await fetch(url, { headers, cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || (typeof json?.code === 'number' && json.code < 0)) throw toApiError(json, res.status)
  return json
}

/** 이 토큰에 동의한 카카오모먼트 광고계정 번호. ["*"]면 고객이 가진 모든 광고계정이다. */
export async function getGrantedMomentAccountIds(accessToken: string): Promise<string[]> {
  const json = await kapiFetch('https://kapi.kakao.com/v1/business/tokeninfo', accessToken)
  const moment = (json.biz_agreements || []).find((a: any) => a.group === 'moment')
  return (moment?.ad_account_ids || []).map(String)
}

export interface KakaoAdAccount {
  id: string
  name: string
  memberType: string // MASTER / MEMBER
  config: string // ON / OFF / DEL
}

/** 고객 카카오계정의 광고계정 목록 (삭제된 계정 제외) */
export async function listAdAccounts(accessToken: string): Promise<KakaoAdAccount[]> {
  const accounts: KakaoAdAccount[] = []
  for (let page = 0; ; page++) {
    const json = await kapiFetch(`${MOMENT_BASE}/adAccounts/pages?config=ON,OFF&page=${page}&size=100`, accessToken)
    for (const a of json.content || []) {
      accounts.push({ id: String(a.id), name: a.name || String(a.id), memberType: a.memberType, config: a.config })
    }
    if (page + 1 >= (json.totalPages ?? 0)) break
  }
  return accounts
}

export interface KakaoCampaign {
  id: string
  name: string
  config: string // ON / OFF / DEL
  systemConfig: string // ON / ADMIN_STOP / EXTERNAL_SERVICE_STOP
}

export async function listCampaigns(accessToken: string, adAccountId: string): Promise<KakaoCampaign[]> {
  const json = await kapiFetch(`${MOMENT_BASE}/campaigns`, accessToken, adAccountId)
  return (json.content || []).map((c: any) => ({
    id: String(c.id),
    name: c.name,
    config: c.config,
    // 문서 예시에 앞 공백(" ON")이 있어 다듬는다
    systemConfig: String(c.systemConfig ?? '').trim(),
  }))
}

export interface KakaoCampaignDay {
  campaignId: string
  date: string // YYYY-MM-DD
  metrics: Record<string, number>
}

const toYmd = (date: string) => date.replace(/-/g, '')
// 응답 날짜는 문서상 yyyyMMdd인데 예시는 yyyy-MM-dd라 둘 다 받는다
const fromYmd = (date: string) => (/^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}` : date)

/**
 * 광고계정의 캠페인별·일자별 보고서. 한 번에 31일까지, 어제까지만 받을 수 있고 광고계정마다 5초에 1번만 부를 수 있어
 * 호출하는 쪽에서 기간을 나누고 간격을 둔다. 전환은 픽셀·SDK 전환 그룹에서 온다.
 */
export async function getCampaignDailyReport(accessToken: string, adAccountId: string, since: string, until: string) {
  const params = new URLSearchParams({ start: toYmd(since), end: toYmd(until), timeUnit: 'DAY', level: 'CAMPAIGN' })
  // 여러 지표 그룹을 보내는 형식이 문서에 없어 resource_ids처럼 같은 이름을 반복한다 (실계정 확인 전)
  params.append('metricsGroup', 'BASIC')
  params.append('metricsGroup', 'PIXEL_SDK_CONVERSION')
  const json = await kapiFetch(`${MOMENT_BASE}/adAccounts/report?${params.toString()}`, accessToken, adAccountId)
  const days: KakaoCampaignDay[] = []
  for (const item of json.data || []) {
    // 데이터가 없는 날·빈 원소({})가 섞여 온다
    const campaignId = item?.dimensions?.campaign_id
    if (!campaignId || !item.start || !item.metrics || Object.keys(item.metrics).length === 0) continue
    days.push({ campaignId: String(campaignId), date: fromYmd(String(item.start)), metrics: item.metrics })
  }
  return days
}
