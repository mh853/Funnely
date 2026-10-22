// 퍼널리 네이버 검색광고 API 키로 광고주 계정을 조회하는 서버 전용 헬퍼 (서명, 권한 받은 광고계정, 캠페인, 일자별 성과)
import crypto from 'crypto'

// 검색광고 API에는 OAuth가 없고 광고주 키를 받는 것도 약관 위반이라, 광고주가 퍼널리 네이버 ID를 광고계정 구성원으로
// 초대하면 퍼널리 키 하나로 X-Customer만 바꿔 호출한다. https://github.com/naver/searchad-apidoc/wiki/FAQ
const API_BASE = 'https://api.searchad.naver.com'

export class NaverAdsApiError extends Error {
  constructor(message: string, public status?: number, public code?: number) {
    super(message)
  }

  /** 광고주가 권한을 해제했거나 받은 적이 없음(403 1006·1018) - 광고주가 다시 초대해야 한다 */
  get noPermission() {
    return this.status === 403 && (this.code === 1006 || this.code === 1018)
  }

  /** 광고주(CUSTOMER_ID)별 호출 속도 제한 */
  get rateLimited() {
    return this.status === 429 || this.code === 1016
  }
}

function apiKey() {
  return process.env.NAVER_SEARCHAD_API_KEY || ''
}

function secretKey() {
  return process.env.NAVER_SEARCHAD_SECRET_KEY || ''
}

/** 퍼널리 검색광고 API 키 환경변수가 실제 값으로 설정돼 있는지 (placeholder는 미설정 취급) */
export function isNaverAdsConfigured() {
  const key = apiKey()
  const secret = secretKey()
  return !!key && !!secret && !key.startsWith('your') && !secret.startsWith('your')
}

/**
 * 이 회사에 네이버 광고 성과 기능을 열지. 실계정 검증 전에는 NAVER_ADS_PILOT_COMPANY_IDS(쉼표 구분 회사 id)가
 * 있으면 그 회사에만 보여준다.
 */
export function isNaverAdsEnabledForCompany(companyId: string | null | undefined) {
  if (!isNaverAdsConfigured() || !companyId) return false
  const pilot = (process.env.NAVER_ADS_PILOT_COMPANY_IDS || '').split(',').map((id) => id.trim()).filter(Boolean)
  return pilot.length === 0 || pilot.includes(companyId)
}

/** 광고주가 자기 광고계정에 초대할 퍼널리 네이버 ID (연결 안내 화면에 보여준다) */
export function getNaverAdsInviteId() {
  return process.env.NAVER_ADS_INVITE_ID || ''
}

/** X-Signature = Base64(HMAC-SHA256(비밀키, "{timestamp}.{METHOD}.{path}")) - 쿼리스트링은 넣지 않는다 */
export function signRequest(timestamp: string, method: string, path: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${method}.${path}`).digest('base64')
}

async function naverFetch(path: string, query: Record<string, string> = {}, customerId?: string) {
  const url = new URL(`${API_BASE}${path}`)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  // 타임스탬프가 어긋나면 403 invalid-timestamp라 호출 직전에 만든다
  const timestamp = String(Date.now())
  const headers: Record<string, string> = {
    'X-Timestamp': timestamp,
    'X-API-KEY': apiKey(),
    'X-Signature': signRequest(timestamp, 'GET', path, secretKey()),
  }
  if (customerId) headers['X-Customer'] = customerId
  const res = await fetch(url, { headers, cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new NaverAdsApiError(json.title || json.message || `네이버 검색광고 API 오류 (${res.status})`, res.status, json.code)
  }
  return json
}

export interface NaverAdAccount {
  adAccountNo: number
  /** X-Customer로 쓰는 검색광고 CUSTOMER_ID (통합광고 번호 adAccountNo와 다르다) */
  customerId: string
  name: string
  roleName: string // OWNER / MASTER / READ_ONLY
  grantedAt: string | null
}

/** 퍼널리 네이버 ID가 구성원으로 들어가 있는 광고계정 전부. 관리자 화면에서만 쓰고 고객에게 목록을 보여주지 않는다. */
export async function listGrantedAdAccounts(): Promise<NaverAdAccount[]> {
  const accounts: NaverAdAccount[] = []
  for (let page = 0; ; page++) {
    const json = await naverFetch('/ad-accounts', { page: String(page), size: '1000' })
    for (const a of json.content || []) {
      if (a.adAccount?.deleted) continue
      accounts.push({
        adAccountNo: a.adAccountNo,
        customerId: String(a.adAccount?.masterCustomerId ?? ''),
        name: a.adAccount?.name || '',
        roleName: a.roleName,
        grantedAt: a.createdAt || null,
      })
    }
    if (json.last !== false) break
  }
  return accounts
}

export interface NaverCampaign {
  nccCampaignId: string
  name: string
  campaignTp: string
  status: string // ELIGIBLE / PAUSED / DELETED …
  userLock: boolean
}

export function listCampaigns(customerId: string): Promise<NaverCampaign[]> {
  return naverFetch('/ncc/campaigns', {}, customerId)
}

export interface NaverDailyStat {
  dateStart: string // YYYY-MM-DD (KST)
  impCnt?: number
  clkCnt?: number
  salesAmt?: number // VAT 포함 광고비
  ccnt?: number
  convAmt?: number
}

/**
 * 캠페인 1개의 일자별 성과. 일자별(timeIncrement=1)은 id 하나로만 받을 수 있고(ids=는 합계만),
 * 한 번에 최대 92일·2년 전까지라 호출하는 쪽에서 기간을 나눈다. 날짜는 KST.
 */
export async function getCampaignDailyStats(customerId: string, campaignId: string, since: string, until: string): Promise<NaverDailyStat[]> {
  const json = await naverFetch(
    '/stats',
    {
      id: campaignId,
      fields: JSON.stringify(['impCnt', 'clkCnt', 'salesAmt', 'ccnt', 'convAmt']),
      timeRange: JSON.stringify({ since, until }),
      timeIncrement: '1',
    },
    customerId
  )
  // 스웨거는 dailyStatResponse로 감싸 적고 위키 예시는 data가 맨 위에 있어 둘 다 받는다 (실계정 확인 전)
  return json.data || json.dailyStatResponse?.data || []
}
