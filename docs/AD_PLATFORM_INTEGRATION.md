# 광고 플랫폼 연동 가이드

## 개요

메디씽크에서 지원하는 광고 플랫폼 연동 방법과 API 사용 가이드입니다.

---

## 지원 플랫폼

1. **Meta (Facebook/Instagram) Ads** - Facebook Marketing API v18.0
2. **Kakao Moment** - Kakao Moment API v2
3. **Google Ads** - Google Ads API v15

---

## 1. Meta (Facebook/Instagram) Ads 연동

### 1.1 개발자 계정 설정

#### Step 1: Meta for Developers 가입
1. [developers.facebook.com](https://developers.facebook.com) 접속
2. Facebook 계정으로 로그인
3. Developer 계정 등록

#### Step 2: 앱 생성
1. "My Apps" → "Create App" 클릭
2. App Type: **"Business"** 선택
3. 앱 정보 입력:
   - App Name: `MediSync`
   - App Contact Email: 관리자 이메일
   - Business Account: 비즈니스 계정 연결

#### Step 3: Marketing API 추가
1. Dashboard → "Add Product"
2. **"Marketing API"** 선택 및 설정
3. Settings → Basic:
   - App Domains: `medisync.com` (또는 Vercel 도메인)
   - Privacy Policy URL: 개인정보 처리방침 URL
   - Terms of Service URL: 이용약관 URL

#### Step 4: OAuth 설정
1. Settings → Basic → "Add Platform"
2. **"Website"** 선택
3. Site URL: `https://medisync.com/auth/callback/meta`
4. Valid OAuth Redirect URIs:
   ```
   https://medisync.com/auth/callback/meta
   https://medisync.vercel.app/auth/callback/meta
   http://localhost:3000/auth/callback/meta (개발용)
   ```

#### Step 5: App 검수
1. App Review → Permissions and Features
2. 필요한 권한 요청:
   - `ads_management` (필수)
   - `ads_read` (필수)
   - `business_management` (선택)
3. Business Verification 진행
4. Use Case 작성 및 제출
5. 스크린샷 및 비디오 제공

**예상 소요 시간**: 2-4주

---

### 1.2 OAuth 2.0 인증 플로우

#### 인증 URL 생성

```typescript
// lib/ad-platforms/meta/auth.ts

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_URL + '/auth/callback/meta';

export function getMetaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: REDIRECT_URI,
    state: state, // CSRF 방지용
    scope: 'ads_management,ads_read,business_management',
    response_type: 'code',
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}
```

#### 콜백 처리 및 토큰 교환

```typescript
// app/auth/callback/meta/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // state 검증 (CSRF 방지)
  // ...

  // Access Token 교환
  const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
  const tokenParams = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri: REDIRECT_URI,
    code: code!,
  });

  const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
  const tokenData = await tokenResponse.json();

  // Short-lived token을 Long-lived token으로 교환
  const longLivedTokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
  const longLivedParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: tokenData.access_token,
  });

  const longLivedResponse = await fetch(`${longLivedTokenUrl}?${longLivedParams.toString()}`);
  const longLivedData = await longLivedResponse.json();

  // 토큰을 DB에 암호화하여 저장
  // ...

  return NextResponse.redirect('/dashboard/ad-accounts');
}
```

#### 토큰 갱신

Long-lived token은 60일간 유효합니다. 자동 갱신 로직:

```typescript
// lib/ad-platforms/meta/token-refresh.ts

export async function refreshMetaToken(adAccountId: string) {
  const adAccount = await getAdAccount(adAccountId);

  if (!adAccount || !isTokenExpiringSoon(adAccount.token_expires_at)) {
    return;
  }

  // Token Debug로 확인
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${adAccount.access_token}&access_token=${META_APP_ID}|${META_APP_SECRET}`;
  const debugResponse = await fetch(debugUrl);
  const debugData = await debugResponse.json();

  // 토큰이 유효하면 그대로 사용, 만료되었으면 재인증 필요
  if (debugData.data.is_valid) {
    // 토큰 갱신 (필요 시)
    // Long-lived token은 자동 갱신되지 않으므로 사용자에게 재인증 요청
  }
}
```

---

### 1.3 API 사용법

#### 광고 계정 조회

```typescript
// lib/ad-platforms/meta/api.ts

export async function getMetaAdAccounts(accessToken: string) {
  const url = 'https://graph.facebook.com/v18.0/me/adaccounts';
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,account_status,currency,timezone_name',
  });

  const response = await fetch(`${url}?${params.toString()}`);
  return await response.json();
}
```

#### 캠페인 조회

```typescript
export async function getMetaCampaigns(adAccountId: string, accessToken: string) {
  const url = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`;
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time',
    limit: '100',
  });

  const response = await fetch(`${url}?${params.toString()}`);
  return await response.json();
}
```

#### 캠페인 성과 조회 (Insights)

```typescript
export async function getMetaCampaignInsights(
  campaignId: string,
  accessToken: string,
  dateRange: { since: string; until: string }
) {
  const url = `https://graph.facebook.com/v18.0/${campaignId}/insights`;
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,conversions',
    time_range: JSON.stringify(dateRange),
    time_increment: '1', // 일별 데이터
  });

  const response = await fetch(`${url}?${params.toString()}`);
  return await response.json();
}
```

#### 캠페인 생성

```typescript
export async function createMetaCampaign(
  adAccountId: string,
  accessToken: string,
  campaignData: {
    name: string;
    objective: string;
    status: string;
    daily_budget?: number;
    lifetime_budget?: number;
  }
) {
  const url = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: accessToken,
      ...campaignData,
    }),
  });

  return await response.json();
}
```

---

### 1.4 Rate Limits

```yaml
App-level:
  기본: 200 calls/hour
  Standard Access: 증가됨 (앱 검수 후)

User-level:
  기본: 개별 관리
  최적화: 배치 요청 사용

해결 방법:
  - 데이터 캐싱 (15분 간격)
  - Batch API 사용
  - 비동기 Insights 요청
```

---

## 2. Kakao Moment 연동

### 2.1 개발자 계정 설정

#### Step 1: Kakao Developers 가입
1. [developers.kakao.com](https://developers.kakao.com) 접속
2. 카카오 계정으로 로그인
3. 개발자 등록

#### Step 2: 애플리케이션 등록
1. "내 애플리케이션" → "애플리케이션 추가하기"
2. 앱 이름: `메디씽크`
3. 사업자명: 사업자등록증 정보

#### Step 3: 플랫폼 설정
1. 앱 선택 → "플랫폼" → "Web 플랫폼 등록"
2. 사이트 도메인:
   ```
   https://medisync.com
   https://medisync.vercel.app
   http://localhost:3000 (개발용)
   ```

#### Step 4: Kakao Moment API 신청
1. "제품 설정" → "Kakao 모먼트"
2. "사용 신청" 클릭
3. 비즈니스 정보 입력
4. 사업자등록증 업로드
5. 검토 대기 (1-2주)

#### Step 5: Redirect URI 설정
1. "제품 설정" → "카카오 로그인"
2. "활성화 설정" ON
3. Redirect URI 등록:
   ```
   https://medisync.com/auth/callback/kakao
   https://medisync.vercel.app/auth/callback/kakao
   http://localhost:3000/auth/callback/kakao
   ```

---

### 2.2 OAuth 2.0 인증 플로우

#### 인증 URL 생성

```typescript
// lib/ad-platforms/kakao/auth.ts

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID!;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_URL + '/auth/callback/kakao';

export function getKakaoAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state: state,
    scope: 'moment',
  });

  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}
```

#### 토큰 교환

```typescript
// app/auth/callback/kakao/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Access Token 발급
  const tokenUrl = 'https://kauth.kakao.com/oauth/token';
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: KAKAO_CLIENT_ID,
    client_secret: KAKAO_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code: code!,
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  const tokenData = await tokenResponse.json();

  // DB에 저장
  // tokenData.access_token
  // tokenData.refresh_token
  // tokenData.expires_in

  return NextResponse.redirect('/dashboard/ad-accounts');
}
```

#### 토큰 갱신

```typescript
export async function refreshKakaoToken(refreshToken: string) {
  const tokenUrl = 'https://kauth.kakao.com/oauth/token';
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: KAKAO_CLIENT_ID,
    client_secret: KAKAO_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  return await response.json();
}
```

---

### 2.3 API 사용법

#### 광고 계정 조회

```typescript
// lib/ad-platforms/kakao/api.ts

export async function getKakaoAdAccounts(accessToken: string) {
  const url = 'https://apis.moment.kakao.com/openapi/v4/adAccounts';

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'adAccountId': 'master', // 마스터 계정으로 전체 조회
    },
  });

  return await response.json();
}
```

#### 캠페인 조회

```typescript
export async function getKakaoCampaigns(adAccountId: string, accessToken: string) {
  const url = 'https://apis.moment.kakao.com/openapi/v4/campaigns';

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'adAccountId': adAccountId,
    },
  });

  return await response.json();
}
```

#### 통계 조회

```typescript
export async function getKakaoStatistics(
  adAccountId: string,
  accessToken: string,
  params: {
    start: string; // YYYY-MM-DD
    end: string;
    level: 'campaign' | 'adGroup' | 'creative';
    metricsGroup: string[];
  }
) {
  const url = 'https://apis.moment.kakao.com/openapi/v4/campaigns/statistics';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'adAccountId': adAccountId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  return await response.json();
}
```

---

### 2.4 Rate Limits

```yaml
일일 호출 한도:
  기본: 10,000 calls/day
  증가 요청: 비즈니스 계정 인증 후 가능

시간당 제한:
  없음 (일일 한도 내)

해결 방법:
  - 배치 조회
  - 캐싱 전략
```

---

## 3. Google Ads 연동

### 3.1 개발자 계정 설정

#### Step 1: Google Cloud Console 프로젝트 생성
1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. "새 프로젝트" 생성: `MediSync`
3. 프로젝트 선택

#### Step 2: Google Ads API 활성화
1. "API 및 서비스" → "라이브러리"
2. "Google Ads API" 검색 및 선택
3. "사용 설정" 클릭

#### Step 3: OAuth 2.0 클라이언트 ID 생성
1. "API 및 서비스" → "사용자 인증 정보"
2. "사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"
3. 애플리케이션 유형: **"웹 애플리케이션"**
4. 이름: `MediSync Web Client`
5. 승인된 리디렉션 URI:
   ```
   https://medisync.com/auth/callback/google
   https://medisync.vercel.app/auth/callback/google
   http://localhost:3000/auth/callback/google
   ```
6. 클라이언트 ID와 시크릿 저장

#### Step 4: Developer Token 신청
1. [ads.google.com](https://ads.google.com) 로그인
2. "도구 및 설정" → "API 센터"
3. "Developer Token 신청"
4. 사용 목적 및 애플리케이션 정보 입력
5. 검토 대기 (1-3주)

#### Step 5: OAuth Consent Screen 설정
1. Google Cloud Console → "OAuth 동의 화면"
2. 사용자 유형: **"외부"**
3. 앱 정보:
   - 앱 이름: `메디씽크`
   - 사용자 지원 이메일
   - 개발자 연락처 정보
4. 범위 추가:
   - `https://www.googleapis.com/auth/adwords`
5. 테스트 사용자 추가 (개발 중)
6. 앱 검수 제출 (프로덕션)

---

### 3.2 OAuth 2.0 인증 플로우

#### 인증 URL 생성

```typescript
// lib/ad-platforms/google/auth.ts

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_URL + '/auth/callback/google';

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline', // Refresh token 발급
    prompt: 'consent', // 매번 consent screen 표시
    state: state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
```

#### 토큰 교환

```typescript
// app/auth/callback/google/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Access Token 발급
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const tokenParams = new URLSearchParams({
    code: code!,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  const tokenData = await tokenResponse.json();

  // DB에 저장
  // tokenData.access_token
  // tokenData.refresh_token (offline access)
  // tokenData.expires_in

  return NextResponse.redirect('/dashboard/ad-accounts');
}
```

#### 토큰 갱신

```typescript
export async function refreshGoogleToken(refreshToken: string) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  return await response.json();
}
```

---

### 3.3 API 사용법

Google Ads API는 gRPC 또는 REST를 사용합니다. REST 예시:

#### 광고 계정 조회

```typescript
// lib/ad-platforms/google/api.ts

const GOOGLE_ADS_API_VERSION = 'v15';
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

export async function getGoogleAdAccounts(
  customerId: string, // Manager 계정 ID
  accessToken: string
) {
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAdsFields:search`;

  const query = `
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone,
      customer.status
    FROM customer
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  return await response.json();
}
```

#### 캠페인 조회

```typescript
export async function getGoogleCampaigns(customerId: string, accessToken: string) {
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`;

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign_budget.amount_micros,
      campaign.start_date,
      campaign.end_date
    FROM campaign
    ORDER BY campaign.id
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  return await response.json();
}
```

#### 캠페인 성과 조회

```typescript
export async function getGoogleCampaignMetrics(
  customerId: string,
  accessToken: string,
  dateRange: { start_date: string; end_date: string }
) {
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`;

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_per_conversion
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.start_date}' AND '${dateRange.end_date}'
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  return await response.json();
}
```

---

### 3.4 Rate Limits

```yaml
기본 할당량:
  15,000 operations/day (Basic Access)

Standard Access (승인 후):
  무제한 (합리적 사용 내)

최적화:
  - GAQL (Google Ads Query Language) 최적화
  - 배치 요청
  - 캐싱
```

---

## 공통 고려사항

### 1. 토큰 보안
- 모든 access_token, refresh_token은 암호화하여 DB 저장
- 환경 변수로 민감 정보 관리
- `.env` 파일은 절대 커밋하지 않음

### 2. 에러 처리
- API 호출 실패 시 재시도 로직
- Rate limit 초과 시 대기 및 재시도
- 토큰 만료 시 자동 갱신

### 3. 로깅
- 모든 API 호출 로그 기록
- 에러 추적 (Sentry 등)
- 성능 모니터링

### 4. 데이터 동기화
- 주기적으로 광고 성과 데이터 동기화
- Cron job 또는 Vercel Cron 사용
- 실패 시 재시도 로직

---

## 환경 변수 설정

```bash
# .env.local

# Meta (Facebook) Ads
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# Kakao Moment
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# Google Ads
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token

# App
NEXT_PUBLIC_URL=https://medisync.com
```

---

## 다음 단계

1. 각 플랫폼 개발자 계정 생성
2. OAuth 인증 플로우 구현
3. API 클라이언트 라이브러리 작성
4. 데이터 동기화 스케줄러 구현
5. 에러 처리 및 로깅 추가

**마지막 업데이트**: 2025-11-12
