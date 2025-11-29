# 실시간 현황 DB 연동 가이드

## 개요

랜딩 페이지의 실시간 현황 기능을 실제 DB 데이터와 연동하기 위한 구현 가이드입니다.

## 현재 구현 상태

### ✅ 완료된 기능
1. **조건부 활성화**: DB 수집 항목 비활성 시 실시간 현황도 자동 비활성화
2. **롤링 설정 UI**: 메시지 템플릿, 롤링 속도, 표시 개수 설정
3. **미리보기 애니메이션**: 데모 데이터로 롤링 효과 시연
4. **템플릿 치환**: `{name}`, `{location}` 플레이스홀더 자동 변환

### ⚠️ 구현 필요 항목
1. **실제 DB 조회**: Supabase에서 최근 리드 데이터 가져오기
2. **실시간 구독**: Supabase Realtime으로 새 리드 실시간 반영
3. **개인정보 보호**: 이름/연락처 마스킹 처리
4. **지역 정보 추출**: 연락처나 별도 필드에서 지역 정보 파싱

## 데이터 구조

### `landing_pages` 테이블 (기존)
```sql
landing_pages (
  id UUID PRIMARY KEY,
  company_id UUID,
  slug TEXT,
  title TEXT,
  realtime_enabled BOOLEAN,
  -- 추가 필요 컬럼
  realtime_template TEXT,      -- 롤링 메시지 템플릿
  realtime_speed INTEGER,       -- 롤링 속도 (초)
  realtime_count INTEGER,       -- 표시할 최근 DB 개수
  ...
)
```

### `leads` 테이블 (기존)
```sql
leads (
  id UUID PRIMARY KEY,
  landing_page_id UUID,
  name TEXT,
  phone TEXT,
  location TEXT,              -- 지역 정보 (추가 권장)
  created_at TIMESTAMP,
  ...
)
```

## 백엔드 구현

### 1. 최근 리드 조회 API

**파일**: `/src/app/api/landing-pages/[id]/recent-leads/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 랜딩 페이지 설정 조회
  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('realtime_count, company_id')
    .eq('id', params.id)
    .single()

  if (!landingPage) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 최근 리드 조회
  const { data: leads, error } = await supabase
    .from('leads')
    .select('name, phone, location, created_at')
    .eq('landing_page_id', params.id)
    .order('created_at', { ascending: false })
    .limit(landingPage.realtime_count || 10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 개인정보 마스킹
  const maskedLeads = leads.map(lead => ({
    name: maskName(lead.name),
    location: lead.location || extractLocation(lead.phone),
    created_at: lead.created_at
  }))

  return NextResponse.json({ leads: maskedLeads })
}

// 이름 마스킹 함수
function maskName(name: string): string {
  if (!name || name.length === 0) return '익명'
  if (name.length === 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

// 전화번호에서 지역 추출 (예: 010 → 서울, 031 → 경기)
function extractLocation(phone: string): string {
  if (!phone) return '알 수 없음'

  const areaCode = phone.replace(/[^0-9]/g, '').substring(0, 3)
  const areaMap: { [key: string]: string } = {
    '02': '서울',
    '031': '경기',
    '032': '인천',
    '051': '부산',
    '053': '대구',
    '062': '광주',
    '042': '대전',
    '052': '울산',
    '044': '세종',
    // 추가 지역번호...
  }

  return areaMap[areaCode] || '기타 지역'
}
```

### 2. Supabase Realtime 구독

**파일**: `/src/components/landing-pages/RealtimeStatus.tsx` (새 파일)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Lead {
  name: string
  location: string
  created_at: string
}

interface RealtimeStatusProps {
  landingPageId: string
  template: string
  speed: number
  count: number
}

export default function RealtimeStatus({
  landingPageId,
  template,
  speed,
  count
}: RealtimeStatusProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const supabase = createClient()

  // 초기 데이터 로드
  useEffect(() => {
    async function fetchLeads() {
      const response = await fetch(`/api/landing-pages/${landingPageId}/recent-leads`)
      const data = await response.json()
      if (data.leads) {
        setLeads(data.leads)
      }
    }
    fetchLeads()
  }, [landingPageId])

  // Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel(`landing-page-${landingPageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `landing_page_id=eq.${landingPageId}`
        },
        async (payload) => {
          // 새 리드가 추가되면 목록 갱신
          const newLead = payload.new as any
          const maskedLead = {
            name: maskName(newLead.name),
            location: newLead.location || '알 수 없음',
            created_at: newLead.created_at
          }

          setLeads(prev => [maskedLead, ...prev].slice(0, count))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [landingPageId, count, supabase])

  // 롤링 애니메이션
  useEffect(() => {
    if (leads.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % leads.length)
    }, speed * 1000)

    return () => clearInterval(interval)
  }, [leads.length, speed])

  if (leads.length === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
        <div className="text-xs font-semibold text-blue-900 mb-2">실시간 현황</div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
          아직 상담 신청이 없습니다
        </div>
      </div>
    )
  }

  const currentLead = leads[currentIndex]
  const displayMessage = template
    .replace('{name}', currentLead.name)
    .replace('{location}', currentLead.location)

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200 overflow-hidden">
      <div className="text-xs font-semibold text-blue-900 mb-2">실시간 현황</div>
      <div className="flex items-center gap-2 text-xs text-blue-700">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
        <div key={currentIndex} className="animate-in fade-in duration-500">
          {displayMessage}
        </div>
      </div>
    </div>
  )
}

function maskName(name: string): string {
  if (!name || name.length === 0) return '익명'
  if (name.length === 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}
```

### 3. 실제 랜딩 페이지에 적용

**파일**: `/src/app/landing/[slug]/page.tsx`

```typescript
import RealtimeStatus from '@/components/landing-pages/RealtimeStatus'

export default async function LandingPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()

  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!landingPage) {
    return notFound()
  }

  return (
    <div>
      {/* ... 다른 섹션들 ... */}

      {landingPage.realtime_enabled && landingPage.collect_data && (
        <RealtimeStatus
          landingPageId={landingPage.id}
          template={landingPage.realtime_template}
          speed={landingPage.realtime_speed}
          count={landingPage.realtime_count}
        />
      )}

      {/* ... 다른 섹션들 ... */}
    </div>
  )
}
```

## 데이터베이스 마이그레이션

### 컬럼 추가 SQL

```sql
-- landing_pages 테이블에 실시간 현황 설정 컬럼 추가
ALTER TABLE landing_pages
ADD COLUMN realtime_template TEXT DEFAULT '{name}님이 {location}에서 상담 신청했습니다',
ADD COLUMN realtime_speed INTEGER DEFAULT 5,
ADD COLUMN realtime_count INTEGER DEFAULT 10;

-- leads 테이블에 지역 정보 컬럼 추가 (선택사항)
ALTER TABLE leads
ADD COLUMN location TEXT;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_leads_landing_page_created
ON leads(landing_page_id, created_at DESC);
```

## 보안 고려사항

### 1. Row Level Security (RLS) 설정

```sql
-- leads 테이블 RLS 정책
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 같은 회사 사용자만 조회 가능
CREATE POLICY "Users can view leads from their company"
ON leads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM landing_pages lp
    JOIN user_profiles up ON up.company_id = lp.company_id
    WHERE lp.id = leads.landing_page_id
    AND up.user_id = auth.uid()
  )
);
```

### 2. API 보호

- 인증된 사용자만 접근 가능
- Rate Limiting 적용 (1분당 60회)
- CORS 설정으로 허용된 도메인만 접근

### 3. 개인정보 보호

- **이름 마스킹**: "김민수" → "김*수"
- **연락처 숨김**: 절대 노출하지 않음
- **지역만 표시**: 상세 주소가 아닌 시/도 단위만
- **최근 N개만**: 오래된 데이터는 자동 제외

## 성능 최적화

### 1. 캐싱 전략

```typescript
// 5분마다 갱신되는 캐시
import { unstable_cache } from 'next/cache'

const getRecentLeads = unstable_cache(
  async (landingPageId: string) => {
    // DB 조회 로직
  },
  ['recent-leads'],
  { revalidate: 300 } // 5분
)
```

### 2. Realtime 연결 최적화

- 불필요한 재구독 방지
- 연결 풀링 사용
- 에러 발생 시 자동 재연결

## 테스트

### 1. 단위 테스트

```typescript
describe('maskName', () => {
  it('should mask name correctly', () => {
    expect(maskName('김민수')).toBe('김*수')
    expect(maskName('홍길동')).toBe('홍*동')
    expect(maskName('이순신')).toBe('이*신')
  })
})
```

### 2. 통합 테스트

```typescript
describe('Realtime Status API', () => {
  it('should return recent leads', async () => {
    const response = await fetch('/api/landing-pages/test-id/recent-leads')
    const data = await response.json()

    expect(data.leads).toHaveLength(10)
    expect(data.leads[0]).toHaveProperty('name')
    expect(data.leads[0]).toHaveProperty('location')
  })
})
```

## 모니터링

### 1. 로그 수집

```typescript
// 실시간 현황 조회 로그
console.log({
  event: 'realtime_status_view',
  landing_page_id: landingPageId,
  lead_count: leads.length,
  timestamp: new Date().toISOString()
})
```

### 2. 성능 메트릭

- API 응답 시간
- Realtime 연결 상태
- 캐시 히트율
- 에러율

## 트러블슈팅

### 문제: Realtime 연결이 끊김

**해결**:
```typescript
// 자동 재연결 로직 추가
const channel = supabase
  .channel(`landing-page-${landingPageId}`)
  .on('postgres_changes', { ... })
  .subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      setTimeout(() => {
        channel.subscribe()
      }, 5000)
    }
  })
```

### 문제: 데이터가 표시되지 않음

**체크리스트**:
1. DB에 실제 리드 데이터가 있는지 확인
2. RLS 정책이 올바르게 설정되었는지 확인
3. API 라우트가 정상 작동하는지 확인
4. 브라우저 콘솔에서 에러 확인

## 배포 체크리스트

- [ ] 데이터베이스 마이그레이션 실행
- [ ] RLS 정책 설정
- [ ] API 라우트 테스트
- [ ] Realtime 구독 테스트
- [ ] 개인정보 마스킹 검증
- [ ] 성능 테스트 (100명 이상 동시 접속)
- [ ] 모니터링 설정
- [ ] 에러 처리 확인

## 추가 개선 사항

### 1. 고급 템플릿 기능

```typescript
// 시간 정보 추가
const template = '{name}님이 {time} 전 {location}에서 상담 신청했습니다'

function getRelativeTime(created_at: string): string {
  const diff = Date.now() - new Date(created_at).getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분`
  return `${Math.floor(minutes / 60)}시간`
}
```

### 2. 애니메이션 효과 개선

- Slide in/out 효과
- 카운트업 애니메이션
- 진행률 바 표시

### 3. A/B 테스팅

- 다양한 메시지 템플릿 테스트
- 최적 롤링 속도 찾기
- 전환율 비교 분석

## 참고 자료

- [Supabase Realtime 공식 문서](https://supabase.com/docs/guides/realtime)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [개인정보보호법 가이드라인](https://www.privacy.go.kr/)
