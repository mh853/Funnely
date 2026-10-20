// 퍼널리 Google OAuth 앱으로 Google Ads API(REST)를 호출하는 서버 전용 헬퍼 (OAuth, 광고 계정, 캠페인, 일자별 성과)

/** 연결 시작 시 심고 콜백에서 비교하는 OAuth state 쿠키 이름 */
export const GOOGLE_ADS_OAUTH_STATE_COOKIE = 'google_ads_oauth_state'

// 개발자 토큰은 2026-09-09 폐지돼 보내지 않는다. 접근 등급(Test/Explorer/Basic)은 OAuth 클라이언트의 Cloud 프로젝트에 붙는다.
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v26'
const ADS_BASE = `https://googleads.googleapis.com/${API_VERSION}`
const ADWORDS_SCOPE = 'https://www.googleapis.com/auth/adwords'

export class GoogleAdsApiError extends Error {
  constructor(message: string, public status?: number, public codes: string[] = []) {
    super(message)
  }

  /** refresh_token 폐기·철회(invalid_grant)나 인증 오류 - 사용자가 다시 연결해야 한다 */
  get needsReconnect() {
    return this.codes.some((c) => c === 'invalid_grant' || c.startsWith('authenticationError.'))
  }

  /** Cloud 프로젝트가 아직 실계정 접근(Explorer 이상) 승인을 못 받음 - 고객 쪽 문제가 아니다 */
  get projectNotApproved() {
    return this.codes.includes('authorizationError.CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION')
  }
}

function clientId() {
  return process.env.GOOGLE_ADS_CLIENT_ID || ''
}

function clientSecret() {
  return process.env.GOOGLE_ADS_CLIENT_SECRET || ''
}

/** 퍼널리 Google OAuth 클라이언트 환경변수가 실제 값으로 설정돼 있는지 (placeholder는 미설정 취급) */
export function isGoogleAdsConfigured() {
  const id = clientId()
  const secret = clientSecret()
  return !!id && !!secret && !id.startsWith('your') && !secret.startsWith('your')
}

/**
 * 이 회사에 구글 광고 성과 기능을 열지. OAuth 앱 검증 전에는 GOOGLE_ADS_PILOT_COMPANY_IDS(쉼표 구분 회사 id)가
 * 있으면 그 회사에만 보여준다. 검증이 끝나면 이 환경변수를 지워 모든 회사에 연다.
 */
export function isGoogleAdsEnabledForCompany(companyId: string | null | undefined) {
  if (!isGoogleAdsConfigured() || !companyId) return false
  const pilot = (process.env.GOOGLE_ADS_PILOT_COMPANY_IDS || '').split(',').map((id) => id.trim()).filter(Boolean)
  return pilot.length === 0 || pilot.includes(companyId)
}

/** OAuth 클라이언트에 등록한 리디렉션 URI와 글자 단위로 같아야 해서 요청 origin이 아닌 고정 도메인으로 만든다 */
export function getGoogleAdsRedirectUri() {
  const domain = (process.env.NEXT_PUBLIC_DOMAIN || 'https://funnely.co.kr').replace(/\/$/, '')
  return `${domain}/auth/callback/google`
}

export function buildGoogleAdsAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: getGoogleAdsRedirectUri(),
    response_type: 'code',
    scope: ADWORDS_SCOPE,
    // 사용자가 없을 때(크론) 호출하려면 refresh_token이 필요하고, prompt=consent여야 재연결 때도 다시 발급된다
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...body }),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) {
    throw new GoogleAdsApiError(json.error_description || json.error || `Google OAuth 오류 (${res.status})`, res.status, [json.error].filter(Boolean))
  }
  return json
}

export interface GoogleAdsToken {
  accessToken: string
  refreshToken: string | null
  scope: string
}

export async function exchangeCodeForToken(code: string): Promise<GoogleAdsToken> {
  const json = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: getGoogleAdsRedirectUri() })
  return { accessToken: json.access_token, refreshToken: json.refresh_token || null, scope: json.scope || '' }
}

export function hasAdwordsScope(token: GoogleAdsToken) {
  return token.scope.split(' ').includes(ADWORDS_SCOPE)
}

/** 액세스 토큰은 약 1시간이라 저장하지 않고 동기화할 때마다 refresh_token으로 새로 받는다 */
export async function refreshAccessToken(refreshToken: string) {
  const json = await tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' })
  return json.access_token as string
}

/** 오류 본문에서 'authorizationError.CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION' 같은 코드를 뽑는다 */
function toApiError(body: any, status: number) {
  const error = (Array.isArray(body) ? body.find((b) => b?.error)?.error : body?.error) || {}
  const codes: string[] = []
  let message = error.message || `Google Ads API 오류 (${status})`
  for (const detail of error.details || []) {
    for (const e of detail.errors || []) {
      for (const [kind, value] of Object.entries(e.errorCode || {})) codes.push(`${kind}.${value}`)
      if (e.message) message = e.message
    }
  }
  return new GoogleAdsApiError(message, status, codes)
}

async function adsFetch(path: string, accessToken: string, init: { body?: unknown; loginCustomerId?: string | null } = {}) {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  // 관리자 계정을 거쳐 하위 계정에 접근할 때만 필요
  if (init.loginCustomerId) headers['login-customer-id'] = init.loginCustomerId
  const res = await fetch(`${ADS_BASE}/${path}`, {
    method: init.body !== undefined ? 'POST' : 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || (Array.isArray(json) ? json.some((b) => b?.error) : json.error)) throw toApiError(json, res.status)
  return json
}

/** GAQL 조회. searchStream은 결과를 배치 배열([{results:[…]}, …])로 주므로 펼쳐서 돌려준다. 1회 호출 = 1 operation. */
async function search<T>(accessToken: string, customerId: string, query: string, loginCustomerId?: string | null): Promise<T[]> {
  const batches = await adsFetch(`customers/${customerId}/googleAds:searchStream`, accessToken, { body: { query }, loginCustomerId })
  return (batches as { results?: T[] }[]).flatMap((b) => b.results || [])
}

export interface GoogleAdsAccount {
  customerId: string // 하이픈 없는 10자리
  name: string
  currency?: string
  timeZone?: string
  testAccount?: boolean
  /** 관리자 계정 하위로 가져온 계정이면 그 관리자 id (호출 시 login-customer-id 헤더) */
  loginCustomerId: string | null
}

/**
 * 연결할 광고 계정 목록. listAccessibleCustomers는 직접 권한이 있는 계정만 주므로, 그중 관리자(MCC) 계정은
 * 바로 아래 하위 계정(1단계)을 펼친다. 관리자 계정 자체는 성과가 없어 빼고, 해지된 계정은 조회가 안 돼 뺀다.
 */
export async function listConnectableAccounts(accessToken: string): Promise<GoogleAdsAccount[]> {
  const { resourceNames = [] } = await adsFetch('customers:listAccessibleCustomers', accessToken)
  const accounts = new Map<string, GoogleAdsAccount>()
  const managers: string[] = []

  for (const resourceName of resourceNames as string[]) {
    const customerId = resourceName.replace('customers/', '')
    try {
      const [row] = await search<any>(
        accessToken,
        customerId,
        'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager, customer.test_account FROM customer'
      )
      const c = row?.customer
      if (!c) continue
      if (c.manager) {
        managers.push(customerId)
        continue
      }
      accounts.set(customerId, {
        customerId,
        name: c.descriptiveName || customerId,
        currency: c.currencyCode,
        timeZone: c.timeZone,
        testAccount: !!c.testAccount,
        loginCustomerId: null,
      })
    } catch (error) {
      // 해지·정지된 계정(CUSTOMER_NOT_ENABLED 등)은 건너뛴다. 프로젝트 미승인은 모든 계정이 같으니 그대로 올린다.
      if (error instanceof GoogleAdsApiError && error.projectNotApproved) throw error
      console.warn('[Google Ads] skip customer', customerId, error instanceof Error ? error.message : error)
    }
  }

  for (const managerId of managers) {
    const rows = await search<any>(
      accessToken,
      managerId,
      `SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code, customer_client.time_zone, customer_client.test_account
       FROM customer_client
       WHERE customer_client.level = 1 AND customer_client.manager = false AND customer_client.status = 'ENABLED'`,
      managerId
    )
    for (const { customerClient: c } of rows) {
      const customerId = String(c.id)
      // 직접 권한도 있는 계정은 관리자 헤더 없이 부르는 쪽을 남긴다
      if (accounts.has(customerId)) continue
      accounts.set(customerId, {
        customerId,
        name: c.descriptiveName || customerId,
        currency: c.currencyCode,
        timeZone: c.timeZone,
        testAccount: !!c.testAccount,
        loginCustomerId: managerId,
      })
    }
  }

  return Array.from(accounts.values())
}

export interface GoogleAdsCampaign {
  campaign: { id: string; name: string; status?: string; servingStatus?: string; advertisingChannelType?: string }
}

/** 성과가 없는 기간에도 상태(종료 등)를 갱신하려고 캠페인 목록을 따로 받는다 */
export function listCampaigns(accessToken: string, customerId: string, loginCustomerId: string | null) {
  return search<GoogleAdsCampaign>(
    accessToken,
    customerId,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.serving_status, campaign.advertising_channel_type
     FROM campaign
     WHERE campaign.status != 'REMOVED'`,
    loginCustomerId
  )
}

export interface GoogleAdsCampaignDay {
  campaign: { id: string; name: string; status?: string; servingStatus?: string }
  segments: { date: string }
  // int64 값은 문자열로 온다
  metrics: {
    impressions?: string
    clicks?: string
    costMicros?: string
    conversions?: number
    allConversions?: number
    conversionsValue?: number
  }
}

/** 캠페인별·일자별 성과 (날짜는 광고 계정 시간대 기준, YYYY-MM-DD). 지표가 모두 0인 날은 오지 않는다. */
export function getCampaignDailyMetrics(
  accessToken: string,
  customerId: string,
  loginCustomerId: string | null,
  since: string,
  until: string
) {
  return search<GoogleAdsCampaignDay>(
    accessToken,
    customerId,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.serving_status, segments.date,
            metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions,
            metrics.all_conversions, metrics.conversions_value
     FROM campaign
     WHERE segments.date BETWEEN '${since}' AND '${until}'`,
    loginCustomerId
  )
}
