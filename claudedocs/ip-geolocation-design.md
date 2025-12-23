# IP 위치 확인 시스템 설계 문서

## 개요
랜딩페이지 실시간 현황 표시에 IP 주소 기반 위치 정보를 추가하는 시스템 설계

**현재 상태 (1단계 완료)**
- ✅ device_type (PC/모바일/태블릿) 기반 실시간 현황 표시
- ✅ Supabase Realtime 구독 활성화
- ✅ 템플릿: `{name}님이 {device}에서 상담 신청했습니다`

**목표 (2단계)**
- IP 주소 → 지역(시/도) 변환
- 템플릿 확장: `{name}님이 {location}에서 {device}로 상담 신청했습니다`

---

## 기술 선택지 비교

### 옵션 1: 무료 공개 API (추천 - 프로토타입)

#### ipapi.co
- **무료 티어**: 30,000 요청/월
- **정확도**: 도시 레벨
- **장점**:
  - 무료 티어로 충분한 볼륨
  - 간단한 JSON API
  - 한국어 지역명 지원
- **단점**:
  - Rate limit (월 30K)
  - API 키 불필요 (익명 사용 가능)
- **비용**: 무료 → $10/월 (150K)

```typescript
// 예시 응답
{
  "ip": "123.456.789.0",
  "city": "Seoul",
  "region": "Seoul",
  "country": "KR",
  "country_name": "South Korea"
}
```

#### ip-api.com
- **무료 티어**: 45 요청/분 (비상업용)
- **정확도**: 도시 레벨
- **장점**:
  - API 키 불필요
  - 빠른 응답 속도
- **단점**:
  - Rate limit 엄격
  - 상업 사용 시 유료 필수
- **비용**: 무료 → $13/월 (1M)

### 옵션 2: 프리미엄 서비스

#### MaxMind GeoIP2
- **무료 티어**: GeoLite2 DB (오프라인)
- **정확도**: 매우 높음
- **장점**:
  - 자체 호스팅 (DB 다운로드)
  - Rate limit 없음
  - 높은 정확도
- **단점**:
  - 월간 DB 업데이트 필요
  - 구현 복잡도 높음
- **비용**: GeoLite2 무료 / GeoIP2 $160/월

---

## 권장 아키텍처

### Phase 2A: 클라이언트 측 구현 (빠른 시작)

**장점**: 빠른 구현, 서버 부하 없음
**단점**: API 키 노출, 클라이언트 의존

```typescript
// src/lib/geolocation/client.ts
export async function getLocationFromIP(ip: string): Promise<string> {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`)
    const data = await response.json()

    // 한국어 지역명 매핑
    const cityMap: Record<string, string> = {
      'Seoul': '서울',
      'Busan': '부산',
      'Incheon': '인천',
      'Daegu': '대구',
      'Daejeon': '대전',
      'Gwangju': '광주',
      'Ulsan': '울산',
      'Sejong': '세종',
      // ... 더 추가
    }

    return cityMap[data.city] || data.region || '알 수 없음'
  } catch (error) {
    console.error('Geolocation failed:', error)
    return '알 수 없음'
  }
}
```

**사용 예시**:
```typescript
// PublicLandingPage.tsx에서
const fetchRecentLeads = async () => {
  const { data } = await supabase
    .from('leads')
    .select('name, device_type, ip_address, created_at')
    .eq('landing_page_id', landingPage.id)
    .order('created_at', { ascending: false })
    .limit(landingPage.realtime_count || 10)

  if (data && data.length > 0) {
    const leadsWithLocation = await Promise.all(
      data.map(async (lead) => ({
        name: lead.name || '익명',
        device: getDeviceLabel(lead.device_type),
        location: lead.ip_address ? await getLocationFromIP(lead.ip_address) : '알 수 없음'
      }))
    )
    setRealtimeLeads(leadsWithLocation)
  }
}
```

### Phase 2B: 서버 측 구현 (프로덕션 권장)

**장점**: API 키 보안, 캐싱, 에러 처리 개선
**단점**: 서버 부하, 구현 복잡도

```typescript
// src/app/api/geolocation/route.ts
import { NextRequest, NextResponse } from 'next/server'

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24시간
const locationCache = new Map<string, { location: string; timestamp: number }>()

export async function POST(request: NextRequest) {
  try {
    const { ip } = await request.json()

    // 캐시 확인
    const cached = locationCache.get(ip)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ location: cached.location })
    }

    // ipapi.co 호출
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'MediSync/1.0' }
    })

    if (!response.ok) {
      throw new Error(`ipapi.co returned ${response.status}`)
    }

    const data = await response.json()

    // 한국어 지역명 매핑
    const location = mapCityToKorean(data.city, data.region)

    // 캐시 저장
    locationCache.set(ip, { location, timestamp: Date.now() })

    return NextResponse.json({ location })
  } catch (error) {
    console.error('Geolocation API error:', error)
    return NextResponse.json(
      { location: '알 수 없음', error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

function mapCityToKorean(city: string, region: string): string {
  const cityMap: Record<string, string> = {
    'Seoul': '서울',
    'Busan': '부산',
    // ... 전체 도시 목록
  }

  return cityMap[city] || cityMap[region] || '알 수 없음'
}
```

**클라이언트에서 사용**:
```typescript
// src/lib/geolocation/client.ts
export async function getLocationFromIP(ip: string): Promise<string> {
  try {
    const response = await fetch('/api/geolocation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    })
    const data = await response.json()
    return data.location
  } catch (error) {
    console.error('Geolocation error:', error)
    return '알 수 없음'
  }
}
```

### Phase 2C: DB 캐싱 최적화 (선택적)

IP → Location 매핑을 DB에 캐싱하여 API 호출 최소화

```sql
-- Migration: 20250224000000_add_ip_location_cache.sql
CREATE TABLE IF NOT EXISTS ip_location_cache (
  ip_address INET PRIMARY KEY,
  city TEXT,
  region TEXT,
  country TEXT,
  location_kr TEXT, -- 한국어 지역명
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_ip_location_updated ON ip_location_cache(updated_at);

-- 자동 만료 (30일 지난 캐시 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_ip_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ip_location_cache
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

**사용 로직**:
```typescript
// src/app/api/geolocation/route.ts
export async function POST(request: NextRequest) {
  const { ip } = await request.json()

  // 1. DB 캐시 확인
  const { data: cached } = await supabase
    .from('ip_location_cache')
    .select('location_kr, updated_at')
    .eq('ip_address', ip)
    .single()

  // 캐시가 있고 7일 이내면 사용
  if (cached && isWithinDays(cached.updated_at, 7)) {
    return NextResponse.json({ location: cached.location_kr })
  }

  // 2. API 호출
  const location = await fetchLocationFromAPI(ip)

  // 3. DB에 캐싱
  await supabase
    .from('ip_location_cache')
    .upsert({
      ip_address: ip,
      location_kr: location,
      updated_at: new Date().toISOString()
    })

  return NextResponse.json({ location })
}
```

---

## 구현 단계별 가이드

### Step 1: 기본 구현 (Phase 2A)

1. **유틸리티 함수 생성**
   ```bash
   mkdir -p src/lib/geolocation
   touch src/lib/geolocation/client.ts
   ```

2. **한국 도시 매핑 데이터 추가**
   - 17개 광역시/도
   - 주요 시/군 포함

3. **PublicLandingPage.tsx 수정**
   - `ip_address` 필드 조회 추가
   - `getLocationFromIP()` 호출
   - `{location}` 템플릿 변수 활성화

4. **LandingPageNewForm.tsx 동일 수정**
   - 미리보기에서도 위치 표시

### Step 2: 서버 API 구현 (Phase 2B)

1. **API 라우트 생성**
   ```bash
   mkdir -p src/app/api/geolocation
   touch src/app/api/geolocation/route.ts
   ```

2. **메모리 캐싱 추가**
   - Map 기반 간단한 캐시
   - TTL 24시간

3. **에러 핸들링**
   - API 실패 시 fallback
   - Rate limit 대응

### Step 3: DB 캐싱 (Phase 2C - 선택)

1. **마이그레이션 실행**
2. **Supabase 쿼리 최적화**
3. **정기 정리 작업 설정**

---

## 템플릿 변수 업그레이드

### 기존 (1단계)
```
{name}님이 {device}에서 상담 신청했습니다
→ "홍길동님이 모바일에서 상담 신청했습니다"
```

### 업그레이드 (2단계)
```
{name}님이 {location}에서 {device}로 상담 신청했습니다
→ "홍길동님이 서울에서 모바일로 상담 신청했습니다"
```

### 지원 변수 (최종)
- `{name}`: 이름
- `{device}`: 기기 타입 (PC/모바일/태블릿)
- `{location}`: 위치 (시/도)

---

## 한국 지역명 매핑 데이터

```typescript
// src/lib/geolocation/city-mapping.ts
export const CITY_MAPPING: Record<string, string> = {
  // 광역시/특별시
  'Seoul': '서울',
  'Busan': '부산',
  'Incheon': '인천',
  'Daegu': '대구',
  'Daejeon': '대전',
  'Gwangju': '광주',
  'Ulsan': '울산',
  'Sejong': '세종',

  // 도
  'Gyeonggi-do': '경기',
  'Gangwon-do': '강원',
  'Chungcheongbuk-do': '충북',
  'Chungcheongnam-do': '충남',
  'Jeollabuk-do': '전북',
  'Jeollanam-do': '전남',
  'Gyeongsangbuk-do': '경북',
  'Gyeongsangnam-do': '경남',
  'Jeju-do': '제주',

  // 주요 도시
  'Suwon': '수원',
  'Seongnam': '성남',
  'Goyang': '고양',
  'Yongin': '용인',
  'Bucheon': '부천',
  'Ansan': '안산',
  'Changwon': '창원',
  'Pohang': '포항',
  'Jeonju': '전주',
  'Cheonan': '천안',
  // ... 더 추가 가능
}
```

---

## 성능 최적화

### 1. 병렬 처리
```typescript
// 여러 IP를 동시에 조회
const leadsWithLocation = await Promise.all(
  leads.map(async (lead) => ({
    ...lead,
    location: await getLocationFromIP(lead.ip_address)
  }))
)
```

### 2. 배치 처리 (선택적)
```typescript
// 한 번에 여러 IP 조회 (API 지원 시)
async function getLocationsForIPs(ips: string[]): Promise<Record<string, string>> {
  // 배치 API 호출 또는 병렬 처리
}
```

### 3. 캐싱 전략
- **메모리 캐시**: 24시간 (빠른 응답)
- **DB 캐시**: 7일 (API 절약)
- **Stale-While-Revalidate**: 백그라운드 갱신

---

## 에러 처리 및 Fallback

```typescript
export async function getLocationFromIP(ip: string): Promise<string> {
  // 1. IP 유효성 검사
  if (!isValidIP(ip)) {
    return '알 수 없음'
  }

  try {
    // 2. API 호출
    const location = await fetchLocationFromAPI(ip)
    return location
  } catch (error) {
    // 3. Fallback 전략
    if (error instanceof RateLimitError) {
      // Rate limit 시 캐시 사용
      return getCachedLocation(ip) || '알 수 없음'
    }

    console.error('Geolocation failed:', error)
    return '알 수 없음'
  }
}
```

---

## 테스트 계획

### 단위 테스트
```typescript
describe('getLocationFromIP', () => {
  it('서울 IP는 "서울"을 반환', async () => {
    const location = await getLocationFromIP('서울_IP')
    expect(location).toBe('서울')
  })

  it('유효하지 않은 IP는 "알 수 없음" 반환', async () => {
    const location = await getLocationFromIP('invalid')
    expect(location).toBe('알 수 없음')
  })

  it('API 실패 시 fallback 동작', async () => {
    // Mock API failure
    const location = await getLocationFromIP('1.2.3.4')
    expect(location).toBe('알 수 없음')
  })
})
```

### 통합 테스트
- 실제 API 호출 테스트 (월간 제한 고려)
- 캐싱 동작 검증
- Realtime 구독과 위치 표시 통합

---

## 비용 예상

### 무료 티어 (ipapi.co)
- **한도**: 30,000 요청/월
- **예상 사용량**:
  - 신규 리드 생성 시: ~500회/월
  - 기존 리드 조회 시: 캐싱으로 최소화
- **예상 비용**: $0/월 (무료 범위 내)

### 유료 전환 시점
- 월 30K 초과 시: $10/월 (150K)
- 트래픽 증가 대비 DB 캐싱 필수

---

## 마이그레이션 및 데이터 정리

### 기존 템플릿 마이그레이션
```sql
-- 기존 {location} 템플릿을 {device}로 변경
UPDATE landing_pages
SET realtime_template = REPLACE(realtime_template, '{location}', '{device}')
WHERE realtime_template LIKE '%{location}%';
```

### 새 템플릿 기본값
```sql
-- 신규 랜딩페이지는 위치+기기 템플릿 사용
ALTER TABLE landing_pages
ALTER COLUMN realtime_template SET DEFAULT '{name}님이 {location}에서 {device}로 상담 신청했습니다';
```

---

## 보안 고려사항

### IP 주소 개인정보
- IP는 개인정보로 간주 가능
- 로그 저장 시 암호화 또는 익명화
- 위치 정보만 저장하고 IP는 캐시 후 삭제 고려

### API 키 보호
- 서버 측 구현으로 API 키 노출 방지
- 환경변수로 관리
- Rate limit 모니터링

---

## 다음 단계

### 즉시 실행 (Phase 2A)
1. ✅ `src/lib/geolocation/client.ts` 생성
2. ✅ `CITY_MAPPING` 데이터 추가
3. ✅ `PublicLandingPage.tsx` 수정
4. ✅ `LandingPageNewForm.tsx` 수정
5. ✅ 테스트 및 배포

### 중기 (Phase 2B)
1. API 라우트 구현
2. 메모리 캐싱 추가
3. 에러 핸들링 강화

### 장기 (Phase 2C)
1. DB 캐싱 마이그레이션
2. 성능 모니터링
3. 비용 최적화

---

## 참고 자료

- [ipapi.co 공식 문서](https://ipapi.co/api/)
- [ip-api.com 문서](https://ip-api.com/docs)
- [MaxMind GeoIP2](https://dev.maxmind.com/geoip)
- [Supabase Realtime 가이드](https://supabase.com/docs/guides/realtime)
