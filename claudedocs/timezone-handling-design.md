# 타임존 처리 설계 - KST 기준 통일

## 📋 문제 상황

**증상**: 타이머 설정 시간이 9시간 차이 발생
- 사용자가 오후 8시로 설정 → 실제로는 오후 11시로 저장됨
- 또는 오전 11시로 설정 → 실제로는 오후 8시로 저장됨

**원인**: UTC와 KST(한국 표준시, UTC+9) 간의 시차 처리 문제
- Supabase는 모든 timestamp를 UTC로 저장
- 브라우저의 `datetime-local` 입력은 로컬 시간대 기준
- 현재 코드는 UTC 시간을 그대로 로컬 시간으로 변환하여 9시간 오차 발생

## 🎯 설계 목표

1. **사용자 경험**: 모든 시간을 한국 시간(KST) 기준으로 입력/표시
2. **데이터 일관성**: Supabase에는 UTC로 저장 (표준)
3. **변환 정확성**: KST ↔ UTC 변환 시 오차 없음
4. **투명성**: 사용자는 시간대 변환을 의식하지 않음

## 🏗️ 아키텍처

```
사용자 입력 (KST)
    ↓
[브라우저 datetime-local 입력]
    ↓
JavaScript 변환: KST → UTC
    ↓
Supabase 저장 (UTC timestamp)
    ↓
읽기 시 변환: UTC → KST
    ↓
사용자에게 표시 (KST)
```

## 📝 상세 설계

### 1. 현재 문제 코드 분석

**LandingPageNewForm.tsx (Lines 121-132)**
```typescript
// ❌ 문제: UTC 시간을 그대로 로컬 컴포넌트로 변환
const [timerDeadline, setTimerDeadline] = useState(() => {
  if (!landingPage?.timer_deadline) return ''
  // UTC Date를 그대로 로컬 시간 형식으로 변환
  const utcDate = new Date(landingPage.timer_deadline)
  const year = utcDate.getFullYear()
  const month = String(utcDate.getMonth() + 1).padStart(2, '0')
  const day = String(utcDate.getDate()).padStart(2, '0')
  const hours = String(utcDate.getHours()).padStart(2, '0')
  const minutes = String(utcDate.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
})
```

**문제점**:
- `new Date(landingPage.timer_deadline)`는 UTC 시간을 브라우저 로컬 시간대로 자동 변환
- 한국에서는 UTC+9가 적용되어 9시간이 더해짐
- 예: DB에 "2025-01-22 14:00 UTC" 저장 → 화면에 "2025-01-22 23:00" 표시

### 2. 올바른 시간대 변환 로직

#### 읽기: UTC → KST
```typescript
// ✅ 올바른 방법: UTC 시간을 KST로 명시적 변환
const [timerDeadline, setTimerDeadline] = useState(() => {
  if (!landingPage?.timer_deadline) return ''

  // UTC 시간 문자열을 Date 객체로 변환
  const utcDate = new Date(landingPage.timer_deadline)

  // KST로 변환 (UTC + 9시간)
  const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000)

  // datetime-local 형식으로 포맷 (YYYY-MM-DDTHH:mm)
  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
})
```

#### 저장: KST → UTC
```typescript
// ✅ 올바른 방법: datetime-local 값을 UTC로 변환하여 저장
const handleSave = async () => {
  // datetime-local 값: "2025-01-22T20:00" (사용자가 입력한 KST)
  if (timerDeadline) {
    // KST 시간 문자열을 Date 객체로 해석
    const kstDate = new Date(timerDeadline + ':00+09:00') // ISO 8601 형식에 KST 명시

    // 또는 명시적 변환
    const localDate = new Date(timerDeadline)
    const utcDate = new Date(localDate.getTime() - 9 * 60 * 60 * 1000)

    // ISO 8601 UTC 문자열로 변환하여 저장
    const utcString = utcDate.toISOString()

    await supabase
      .from('landing_pages')
      .update({ timer_deadline: utcString })
      .eq('id', landingPageId)
  }
}
```

### 3. 타임존 유틸리티 함수 생성

**파일**: `src/lib/utils/timezone.ts` (신규)

```typescript
/**
 * 타임존 변환 유틸리티
 *
 * 한국 표준시(KST) = UTC+9
 * Supabase는 모든 timestamp를 UTC로 저장
 */

const KST_OFFSET = 9 * 60 * 60 * 1000 // 9시간 (밀리초)

/**
 * UTC timestamp를 KST datetime-local 형식으로 변환
 *
 * @param utcTimestamp - Supabase에서 가져온 UTC timestamp
 * @returns datetime-local 입력에 사용할 형식 (YYYY-MM-DDTHH:mm)
 *
 * 예: "2025-01-22T14:00:00Z" → "2025-01-22T23:00"
 */
export function utcToKstDatetimeLocal(utcTimestamp: string | null | undefined): string {
  if (!utcTimestamp) return ''

  const utcDate = new Date(utcTimestamp)
  const kstDate = new Date(utcDate.getTime() + KST_OFFSET)

  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * KST datetime-local 형식을 UTC ISO 8601 문자열로 변환
 *
 * @param kstDatetimeLocal - datetime-local 입력값 (YYYY-MM-DDTHH:mm)
 * @returns Supabase 저장용 UTC ISO 8601 문자열
 *
 * 예: "2025-01-22T23:00" → "2025-01-22T14:00:00.000Z"
 */
export function kstDatetimeLocalToUtc(kstDatetimeLocal: string | null | undefined): string | null {
  if (!kstDatetimeLocal) return null

  // datetime-local 값을 KST Date로 해석 (초 추가)
  const kstDate = new Date(kstDatetimeLocal + ':00')

  // KST를 UTC로 변환 (9시간 빼기)
  const utcDate = new Date(kstDate.getTime() - KST_OFFSET)

  // ISO 8601 UTC 문자열 반환
  return utcDate.toISOString()
}

/**
 * 현재 KST 시간을 datetime-local 형식으로 반환
 *
 * @returns 현재 KST 시간 (YYYY-MM-DDTHH:mm)
 */
export function getCurrentKstDatetimeLocal(): string {
  const now = new Date()
  const kstNow = new Date(now.getTime() + KST_OFFSET)

  const year = kstNow.getUTCFullYear()
  const month = String(kstNow.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstNow.getUTCDate()).padStart(2, '0')
  const hours = String(kstNow.getUTCHours()).padStart(2, '0')
  const minutes = String(kstNow.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * KST 날짜 문자열 포맷팅
 *
 * @param utcTimestamp - UTC timestamp
 * @param format - 'full' | 'date' | 'time'
 * @returns 포맷된 KST 문자열
 */
export function formatKst(
  utcTimestamp: string | null | undefined,
  format: 'full' | 'date' | 'time' = 'full'
): string {
  if (!utcTimestamp) return '-'

  const utcDate = new Date(utcTimestamp)
  const kstDate = new Date(utcDate.getTime() + KST_OFFSET)

  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')

  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`
    case 'time':
      return `${hours}:${minutes}`
    case 'full':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}`
  }
}
```

### 4. 코드 수정 위치

#### A. LandingPageNewForm.tsx

**읽기 (State 초기화)**:
```typescript
import { utcToKstDatetimeLocal, kstDatetimeLocalToUtc } from '@/lib/utils/timezone'

// ✅ 수정: UTC → KST 변환
const [timerDeadline, setTimerDeadline] = useState(() => {
  return utcToKstDatetimeLocal(landingPage?.timer_deadline)
})
```

**저장 (Submit 핸들러)**:
```typescript
// ✅ 수정: KST → UTC 변환
const deadlineUtc = kstDatetimeLocalToUtc(timerDeadline)

const { error } = await supabase
  .from('landing_pages')
  .update({
    timer_deadline: deadlineUtc, // UTC로 저장
    // ... 기타 필드
  })
  .eq('id', landingPageId)
```

#### B. PublicLandingPage.tsx

**타이머 카운트다운 계산**:
```typescript
// 현재 코드는 이미 올바름 (UTC → 로컬 시간 자동 변환)
// new Date(landingPage.timer_deadline) 는 브라우저가 자동으로 KST로 변환
const calculateTimeLeft = () => {
  const deadline = new Date(landingPage.timer_deadline!)
  const difference = deadline.getTime() - Date.now()
  // ... 시간 계산
}
```

**만료 체크**:
```typescript
// 현재 코드는 이미 올바름
useEffect(() => {
  if (landingPage.timer_enabled &&
      landingPage.timer_deadline &&
      !landingPage.timer_auto_update) {

    const deadline = new Date(landingPage.timer_deadline).getTime()
    const now = Date.now()

    if (now > deadline) {
      setIsExpired(true)
    }
  }
}, [landingPage.timer_enabled, landingPage.timer_deadline, landingPage.timer_auto_update])
```

#### C. Cron Job (disable-expired-timers/route.ts)

**현재 코드는 이미 올바름**:
```typescript
// Supabase는 UTC 기준으로 비교
const now = new Date().toISOString() // UTC 문자열
const { data: expiredPages } = await supabase
  .from('landing_pages')
  .select('id, title, timer_deadline')
  .lt('timer_deadline', now) // UTC 기준 비교
```

#### D. API Submit Route (submit/route.ts)

**현재 코드는 이미 올바름**:
```typescript
// UTC 기준 비교
if (landingPage.timer_enabled &&
    landingPage.timer_deadline &&
    !landingPage.timer_auto_update) {
  const deadline = new Date(landingPage.timer_deadline)
  if (new Date() > deadline) {
    return NextResponse.json(
      { error: { message: '신청 기간이 종료되었습니다.' } },
      { status: 403 }
    )
  }
}
```

## 🧪 테스트 시나리오

### 시나리오 1: 새 타이머 생성
```
1. 사용자가 "2025-01-23 20:00" (KST) 입력
2. 저장 시 UTC로 변환: "2025-01-23T11:00:00.000Z"
3. Supabase에 UTC로 저장
4. 다시 읽을 때 KST로 표시: "2025-01-23 20:00"
```

### 시나리오 2: 기존 타이머 수정
```
1. DB: "2025-01-22T14:00:00Z" (UTC)
2. 화면 표시: "2025-01-22 23:00" (KST)
3. 사용자가 "2025-01-23 09:00"으로 수정
4. 저장: "2025-01-23T00:00:00.000Z" (UTC)
```

### 시나리오 3: 자정 전후 시간
```
1. 사용자 입력: "2025-01-23 02:00" (KST, 자정 이후)
2. UTC 변환: "2025-01-22T17:00:00.000Z" (전날)
3. 저장 후 읽기: "2025-01-23 02:00" (원래 시간 유지)
```

### 시나리오 4: 타이머 만료 체크
```
현재 시간: 2025-01-23 20:30 KST
타이머 마감: 2025-01-23 20:00 KST (DB: 11:00 UTC)

브라우저:
- now = Date.now() (로컬 시간 기준 timestamp)
- deadline = new Date("2025-01-23T11:00:00Z").getTime()
- 브라우저가 자동으로 KST 변환하여 비교
- now > deadline → 만료됨 ✅
```

## ⚠️ 주의사항

### 1. datetime-local 입력의 특성
```typescript
// ❌ 잘못된 방법
<input type="datetime-local" value={new Date().toISOString()} />
// toISOString()은 UTC 시간 반환 → 9시간 오차

// ✅ 올바른 방법
<input type="datetime-local" value={utcToKstDatetimeLocal(timestamp)} />
```

### 2. 서버 사이드 vs 클라이언트 사이드
- **서버**: UTC 기준으로 모든 계산 수행
- **클라이언트**: 사용자에게 표시할 때만 KST 변환
- **Supabase**: 항상 UTC로 저장

### 3. DST (Daylight Saving Time)
- 한국은 DST를 사용하지 않음
- KST는 항상 UTC+9로 고정
- 다른 국가 지원 시 moment-timezone 등의 라이브러리 고려

## 📊 구현 우선순위

### Phase 1: 핵심 수정 (즉시)
1. ✅ timezone.ts 유틸리티 생성
2. ✅ LandingPageNewForm.tsx 수정 (읽기/쓰기)
3. ✅ 테스트 및 검증

### Phase 2: 개선 사항 (선택)
1. 다른 컴포넌트에도 timezone 유틸리티 적용
2. 관리자 대시보드에 KST 명시 표시
3. 타임존 설정 UI 추가 (향후 글로벌 서비스 대비)

## 🔗 관련 파일

**수정 필요**:
- `/src/lib/utils/timezone.ts` (신규)
- `/src/components/landing-pages/LandingPageNewForm.tsx` (수정)

**확인 필요 (현재 올바름)**:
- `/src/components/landing-pages/PublicLandingPage.tsx` ✅
- `/src/app/api/cron/disable-expired-timers/route.ts` ✅
- `/src/app/api/landing-pages/submit/route.ts` ✅

---

## 💡 결론

타임존 문제의 핵심은 **UTC 저장, KST 표시** 원칙을 일관되게 적용하는 것입니다.

**핵심 원칙**:
1. Supabase에는 항상 UTC로 저장
2. 사용자에게는 항상 KST로 표시
3. datetime-local 입력값을 UTC로 명시적 변환
4. 서버 사이드 계산은 UTC 기준 유지

이 설계를 따르면 9시간 시차 문제가 완전히 해결됩니다! 🎯
