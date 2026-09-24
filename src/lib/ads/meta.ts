// 퍼널리 Meta 앱으로 Graph/Marketing API를 호출하는 서버 전용 헬퍼 (OAuth, 광고 계정, 캠페인, 인사이트)
import crypto from 'crypto'

/** 연결 시작 시 심고 콜백에서 비교하는 OAuth state 쿠키 이름 */
export const META_OAUTH_STATE_COOKIE = 'meta_oauth_state'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v25.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

export class MetaApiError extends Error {
  constructor(message: string, public code?: number, public subcode?: number) {
    super(message)
  }

  /** 토큰 만료·폐기·권한 철회 - 사용자가 다시 연결해야 한다 */
  get needsReconnect() {
    return this.code === 190 || this.code === 102
  }
}

function appId() {
  return process.env.META_APP_ID || ''
}

function appSecret() {
  return process.env.META_APP_SECRET || ''
}

/** 퍼널리 Meta 앱 환경변수가 실제 값으로 설정돼 있는지 (.env 예시의 placeholder는 미설정 취급) */
export function isMetaConfigured() {
  const id = appId()
  const secret = appSecret()
  return !!id && !!secret && !id.startsWith('your') && !secret.startsWith('your')
}

/**
 * 이 회사에 Meta 광고 성과 기능을 열지. 앱 검수(ads_read 고급 액세스) 전에는 앱 역할이 있는 사람만
 * 로그인할 수 있어, META_ADS_PILOT_COMPANY_IDS(쉼표 구분 회사 id)가 있으면 그 회사에만 보여준다.
 * 검수가 끝나면 이 환경변수를 지워 모든 회사에 연다.
 */
export function isMetaEnabledForCompany(companyId: string | null | undefined) {
  if (!isMetaConfigured() || !companyId) return false
  const pilot = (process.env.META_ADS_PILOT_COMPANY_IDS || '').split(',').map((id) => id.trim()).filter(Boolean)
  return pilot.length === 0 || pilot.includes(companyId)
}

/**
 * 로그인 다이얼로그와 코드 교환에 쓰는 redirect_uri - Meta는 두 값이 글자 단위로 같아야 하고
 * 앱에 등록된 URI와도 정확히 일치해야 하므로, 요청 origin(커스텀 도메인·www·프리뷰)이 아닌
 * 고정 도메인에서 만든다.
 */
export function getMetaRedirectUri() {
  const domain = (process.env.NEXT_PUBLIC_DOMAIN || 'https://funnely.co.kr').replace(/\/$/, '')
  return `${domain}/auth/callback/meta`
}

export function buildMetaAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: appId(),
    redirect_uri: getMetaRedirectUri(),
    state,
    response_type: 'code',
  })
  // 비즈니스 앱은 Facebook Login for Business 구성(config_id)으로 다이얼로그를 띄워야 앱 역할이
  // 없는 고객도 로그인할 수 있다. 구성이 없으면 scope로 요청(앱 관리자·개발자만 가능).
  const configId = process.env.META_LOGIN_CONFIG_ID
  if (configId) {
    params.set('config_id', configId)
  } else {
    params.set('scope', 'ads_read')
  }
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`
}

async function graphFetch(path: string, params: Record<string, string>, accessToken?: string) {
  // paging.next는 완성된 URL로 오므로 그대로 쓰되, 토큰·증명값은 아래에서 다시 붙인다
  const url = new URL(path.startsWith('https://') ? path : `${GRAPH_BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  if (accessToken) {
    url.searchParams.set('access_token', accessToken)
    // 앱 설정에서 "앱 시크릿 증명 필요"를 켜도 동작하도록 항상 함께 보낸다
    url.searchParams.set('appsecret_proof', crypto.createHmac('sha256', appSecret()).update(accessToken).digest('hex'))
  }
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) {
    const err = json.error || {}
    throw new MetaApiError(err.message || `Meta API 오류 (${res.status})`, err.code, err.error_subcode)
  }
  return json
}

/** paging.next를 끝까지 따라가며 data를 모은다 (next URL엔 토큰·파라미터가 이미 들어 있음) */
async function graphFetchAll<T>(path: string, params: Record<string, string>, accessToken: string): Promise<T[]> {
  const items: T[] = []
  let page = await graphFetch(path, params, accessToken)
  items.push(...(page.data || []))
  while (page.paging?.next) {
    page = await graphFetch(page.paging.next, {}, accessToken)
    items.push(...(page.data || []))
  }
  return items
}

export interface MetaToken {
  accessToken: string
  expiresAt: string | null
}

function toExpiresAt(expiresIn: unknown): string | null {
  const seconds = Number(expiresIn)
  return seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null
}

/** 인가 코드 → 단기 토큰 → 장기 토큰(약 60일). 장기 교환이 안 되는 토큰(시스템 사용자 등)은 받은 그대로 쓴다. */
export async function exchangeCodeForToken(code: string): Promise<MetaToken> {
  const short = await graphFetch('oauth/access_token', {
    client_id: appId(),
    client_secret: appSecret(),
    redirect_uri: getMetaRedirectUri(),
    code,
  })
  try {
    const long = await graphFetch('oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: appId(),
      client_secret: appSecret(),
      fb_exchange_token: short.access_token,
    })
    return { accessToken: long.access_token, expiresAt: toExpiresAt(long.expires_in) }
  } catch {
    return { accessToken: short.access_token, expiresAt: toExpiresAt(short.expires_in) }
  }
}

export interface MetaAdAccount {
  id: string // act_123
  account_id: string // 123
  name: string
  currency?: string
  timezone_name?: string
  account_status?: number
}

export function listAdAccounts(accessToken: string) {
  return graphFetchAll<MetaAdAccount>(
    'me/adaccounts',
    { fields: 'id,account_id,name,currency,timezone_name,account_status', limit: '100' },
    accessToken
  )
}

export interface MetaCampaign {
  id: string
  name: string
  effective_status?: string
  objective?: string
}

// ad_accounts.account_id는 예전 연동부터 `act_123` 형태로 저장돼 있어 두 형태를 모두 받는다
function actPath(accountId: string) {
  return `act_${accountId.replace(/^act_/, '')}`
}

export function listCampaigns(accessToken: string, accountId: string) {
  return graphFetchAll<MetaCampaign>(
    `${actPath(accountId)}/campaigns`,
    { fields: 'id,name,effective_status,objective', limit: '200' },
    accessToken
  )
}

export interface MetaCampaignInsight {
  campaign_id: string
  campaign_name: string
  date_start: string
  impressions?: string
  clicks?: string
  spend?: string
  reach?: string
  frequency?: string
  actions?: { action_type: string; value: string }[]
}

/** 캠페인별·일자별 성과 (날짜는 광고 계정 시간대 기준, YYYY-MM-DD) */
export function getCampaignDailyInsights(accessToken: string, accountId: string, since: string, until: string) {
  return graphFetchAll<MetaCampaignInsight>(
    `${actPath(accountId)}/insights`,
    {
      level: 'campaign',
      fields: 'campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,actions',
      time_increment: '1',
      time_range: JSON.stringify({ since, until }),
      limit: '500',
    },
    accessToken
  )
}
