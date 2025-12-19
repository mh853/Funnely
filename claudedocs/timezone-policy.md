# 시간대(Timezone) 처리 정책

## 📋 기본 원칙

MediSync 시스템은 **UTC 기준 저장, 사용자 타임존 표시** 정책을 따릅니다.

---

## 🌍 시간대 처리 전략

### 서버 사이드 (Backend/Database)
**원칙**: 모든 시간은 **UTC**로 저장 및 처리

**이유**:
- ✅ 국제화(i18n) 지원 용이
- ✅ 데이터베이스 일관성 유지
- ✅ 타임존 변경에 강건함
- ✅ 서버 로직 단순화

**구현**:
```typescript
// ✅ 올바른 방법
const now = new Date()              // 시스템 로컬 시간
const utcString = now.toISOString() // UTC로 변환: "2025-12-19T01:00:00.000Z"

// ❌ 잘못된 방법
const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000) // 타임존 하드코딩
```

### 클라이언트 사이드 (Frontend)
**원칙**: UTC로 저장된 시간을 **사용자 타임존**으로 변환하여 표시

**구현**:
```typescript
// date-fns 사용 (한국 로케일)
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

const utcDate = new Date(subscription.current_period_end) // UTC 파싱
const displayDate = format(utcDate, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
// 브라우저가 자동으로 사용자 타임존으로 변환
```

---

## ⏰ Cron Job 실행 시간

### Vercel Cron Schedule
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-tasks",
      "schedule": "0 1 * * *"  // UTC 01:00
    }
  ]
}
```

### 실행 시간 매핑
| UTC | 한국(KST) | 설명 |
|-----|----------|------|
| 00:00 | 09:00 | 새벽 시간대 |
| 01:00 | 10:00 | **현재 설정** (오전) |
| 16:00 | 01:00 | 다음날 새벽 1시 |

**현재 설정**: UTC 01:00 = **한국 시간 오전 10시**

**새벽 실행이 필요한 경우**:
```json
"schedule": "0 16 * * *"  // UTC 16:00 = KST 01:00 (다음날)
```

---

## 📊 데이터베이스 저장 형식

### PostgreSQL (Supabase)
```sql
-- 모든 TIMESTAMPTZ 컬럼은 UTC로 저장됨
CREATE TABLE company_subscriptions (
  current_period_end TIMESTAMPTZ NOT NULL,  -- UTC로 저장
  grace_period_end TIMESTAMPTZ,             -- UTC로 저장
  created_at TIMESTAMPTZ DEFAULT NOW()      -- UTC NOW()
);
```

### 예시 데이터
```sql
-- 저장된 값 (UTC)
current_period_end: '2025-12-19T15:00:00Z'

-- 사용자가 보는 값 (KST)
→ 2025년 12월 20일 00:00 (브라우저 자동 변환)
```

---

## 🔄 시간 비교 로직

### 서버 사이드 비교
```typescript
// ✅ 올바른 UTC 비교
const now = new Date()  // 시스템 시간
const periodEnd = new Date(subscription.current_period_end) // UTC 파싱

if (periodEnd < now) {
  // 만료됨
}

// ❌ 잘못된 문자열 비교
if (subscription.current_period_end < '2025-12-19T10:00:00') {
  // 타임존 정보 없음
}
```

### ISO String 사용
```typescript
// ✅ 올바른 방법
const now = new Date().toISOString()  // "2025-12-19T01:00:00.000Z"

// Supabase 쿼리
.gte('current_period_end', now)  // UTC 비교
.lte('current_period_end', sevenDaysLater.toISOString())
```

---

## 🎨 프론트엔드 표시 가이드

### date-fns 사용 (권장)
```typescript
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

// 절대 시간
const absoluteTime = format(
  new Date(utcTimestamp),
  'yyyy년 MM월 dd일 HH:mm',
  { locale: ko }
)
// → "2025년 12월 19일 10:00"

// 상대 시간
const relativeTime = formatDistanceToNow(
  new Date(utcTimestamp),
  { addSuffix: true, locale: ko }
)
// → "7일 후"
```

### 만료 카운트다운
```typescript
// D-Day 계산
const daysRemaining = Math.ceil(
  (new Date(periodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
)
// → "D-7" 또는 "7일 남음"
```

---

## ⚠️ 주의사항

### 1. 타임존 하드코딩 금지
```typescript
// ❌ 절대 하지 말 것
const kstOffset = 9 * 60
const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000)
```

**이유**:
- DST (일광 절약 시간) 고려 안됨
- 다른 국가 사용자 지원 불가
- 유지보수 어려움

### 2. 로컬 시간 직접 저장 금지
```typescript
// ❌ 잘못된 방법
const localTime = new Date().toLocaleString('ko-KR')
// "2025. 12. 19. 오전 10:00:00" (타임존 정보 손실)

// ✅ 올바른 방법
const utcTime = new Date().toISOString()
// "2025-12-19T01:00:00.000Z" (타임존 정보 포함)
```

### 3. 문자열 비교 주의
```typescript
// ❌ 위험한 비교
if ('2025-12-19T10:00:00' < '2025-12-19T15:00:00') {
  // 타임존 정보가 없어 오해의 소지
}

// ✅ 안전한 비교
if (new Date('2025-12-19T10:00:00Z') < new Date('2025-12-19T15:00:00Z')) {
  // UTC 기준 명확
}
```

---

## 🧪 테스트 시나리오

### 시간대 테스트
```typescript
// UTC 자정
const utcMidnight = new Date('2025-12-19T00:00:00Z')
console.log(utcMidnight.toLocaleString('ko-KR'))
// → "2025. 12. 19. 오전 9:00:00" (KST)

// KST 자정을 UTC로 표현
const kstMidnight = new Date('2025-12-18T15:00:00Z')
console.log(kstMidnight.toLocaleString('ko-KR'))
// → "2025. 12. 19. 오전 12:00:00" (KST)
```

### Cron 실행 시간 검증
```bash
# 로컬 테스트 (시간 확인)
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/daily-tasks

# 응답에서 timestamp 확인
{
  "timestamp": "2025-12-19T01:00:00.000Z",  // UTC
  "tasksExecuted": [...]
}
```

---

## 📚 참고 자료

### 공식 문서
- [MDN Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [date-fns Documentation](https://date-fns.org/)
- [PostgreSQL TIMESTAMPTZ](https://www.postgresql.org/docs/current/datatype-datetime.html)

### 내부 문서
- [구독 만료 시스템 구현 가이드](subscription-expiry-implementation-summary.md)
- [테스트 결과 문서](subscription-expiry-test-results.md)

---

## ✅ 체크리스트

### 새로운 기능 개발 시
- [ ] 서버에서 `new Date().toISOString()` 사용하여 UTC 저장
- [ ] DB 컬럼은 `TIMESTAMPTZ` 타입 사용
- [ ] 프론트엔드에서 `date-fns` + `ko` 로케일로 표시
- [ ] 시간 비교는 `Date` 객체 사용 (문자열 비교 금지)
- [ ] Cron 스케줄은 UTC 기준으로 설정
- [ ] 문서에 "UTC" 또는 "KST" 명시

### 코드 리뷰 시
- [ ] 타임존 하드코딩 없는지 확인
- [ ] ISO 8601 형식 (`toISOString()`) 사용 확인
- [ ] 프론트엔드 로케일 설정 확인
- [ ] 시간 비교 로직 검증

---

**작성일**: 2025-12-19
**최종 수정**: 2025-12-19
**버전**: 1.0
