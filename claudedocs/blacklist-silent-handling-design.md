# 블랙리스트 전화번호 Silent Handling 설계

## 📋 요구사항

**목표**: 블랙리스트에 등록된 전화번호가 랜딩페이지에서 제출되어도 정상적으로 제출 완료 메시지를 표시하되, 실제로는 DB에 저장하지 않음

**현재 동작**:
- 블랙리스트 전화번호 제출 시 → `403 에러` 반환 → "등록할 수 없는 전화번호입니다" 에러 메시지 표시

**변경할 동작**:
- 블랙리스트 전화번호 제출 시 → `200 성공` 반환 → "신청이 완료되었습니다" 성공 메시지 표시 → DB 저장 안 함

## 🎯 설계 원칙

### 1. **사용자 경험 일관성**
- 블랙리스트 여부와 관계없이 모든 사용자에게 동일한 성공 화면 제공
- 블랙리스트 여부를 노출하지 않음 (보안 및 개인정보 보호)

### 2. **서버 사이드 검증**
- 블랙리스트 체크는 서버에서만 수행 (클라이언트 우회 불가)
- 데이터 무결성 보장 (블랙리스트 번호는 절대 DB 저장 안 됨)

### 3. **로깅 및 모니터링**
- 블랙리스트 제출 시도를 서버 로그에 기록
- 관리자가 블랙리스트 효과를 추적 가능

### 4. **성능 최적화**
- 블랙리스트 체크를 병렬 쿼리로 유지 (기존 성능 유지)
- 불필요한 DB 쓰기 작업 제거 (블랙리스트 번호)

## 🏗️ 아키텍처 설계

### 시스템 흐름도

```
┌─────────────┐
│ 사용자 입력 │
│ (FormSection)│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ API: /api/landing-pages/submit  │
│                                 │
│ 1. 필수 필드 검증               │
│ 2. 병렬 쿼리 실행:              │
│    ├─ Landing Page 조회         │
│    ├─ Referrer Company 조회     │
│    ├─ 중복 체크                 │
│    └─ ✅ 블랙리스트 체크        │
│                                 │
│ 3. 블랙리스트 체크 결과:        │
│    ├─ 발견 → 로그 기록          │
│    │         └─ 성공 응답 반환   │
│    │            (DB 저장 안 함)  │
│    └─ 미발견 → 정상 처리        │
│                └─ DB 저장        │
│                   성공 응답 반환 │
└─────────────┬───────────────────┘
              │
              ▼
       ┌──────────────┐
       │ 200 OK       │
       │ success:true │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │ 성공 화면 표시│
       │   (동일)     │
       └──────────────┘
```

## 📝 구현 세부사항

### 1. API Route 변경 (`/src/app/api/landing-pages/submit/route.ts`)

#### 현재 코드 (135-142번째 줄)
```typescript
// 블랙리스트 체크
if (blacklistedPhone) {
  console.log('[Landing Page Submit] Blocked blacklisted phone:', phone)
  return NextResponse.json(
    { error: { message: '등록할 수 없는 전화번호입니다' } },
    { status: 403 }
  )
}
```

#### 변경 후 코드
```typescript
// 블랙리스트 체크 - Silent handling (사용자에게 에러 표시 안 함)
if (blacklistedPhone) {
  console.log('[Landing Page Submit] Blocked blacklisted phone (silent):', {
    phone: phone.replace(/\d{4}$/, '****'), // 마스킹된 전화번호 로그
    landing_page_id,
    company_id: landingPage.company_id,
    timestamp: new Date().toISOString()
  })

  // ✅ 정상 성공 응답 반환 (실제로는 DB 저장 안 함)
  return NextResponse.json({
    success: true,
    data: {
      lead_id: null, // 실제 lead_id 없음 (저장 안 했으므로)
      message: '신청이 완료되었습니다',
    },
  })
}
```

### 2. 로그 형식 설계

**로그 레벨**: `INFO` (에러가 아님, 정상적인 보안 동작)

**로그 구조**:
```typescript
{
  event: 'BLACKLIST_SUBMISSION_BLOCKED',
  masked_phone: '010-1234-****',      // 마스킹된 전화번호
  landing_page_id: 'uuid',
  company_id: 'uuid',
  timestamp: '2025-02-24T10:30:00.000Z',
  user_agent: 'Mozilla/5.0...',
  ip_address: '123.45.67.89',
  referrer: 'https://example.com'
}
```

**로그 활용**:
- 블랙리스트 효과성 측정 (차단된 시도 횟수)
- 악의적 패턴 탐지 (동일 IP에서 반복 시도)
- 블랙리스트 관리 개선 (불필요한 번호 제거)

### 3. 성능 영향 분석

**변경 전**:
```
병렬 쿼리 (4개) → 블랙리스트 발견 → 403 에러 반환
└─ 약 100-150ms 소요
```

**변경 후**:
```
병렬 쿼리 (4개) → 블랙리스트 발견 → 로그 기록 → 200 성공 반환
└─ 약 100-150ms 소요 (동일)
```

**성능 개선**:
- DB 저장 작업 제거 → 약 50-100ms 절약
- 전체 응답 속도: 블랙리스트 케이스가 더 빠름

### 4. 보안 고려사항

#### ✅ 보안 강화 요소
1. **클라이언트 우회 불가**: 서버 사이드에서만 검증
2. **블랙리스트 노출 방지**: 사용자가 자신의 번호가 블랙리스트인지 알 수 없음
3. **로그 마스킹**: 전화번호 뒷자리 마스킹 (GDPR/개인정보보호법 준수)

#### ⚠️ 고려 필요한 사항
1. **중복 체크와의 상호작용**
   - 블랙리스트 번호는 DB에 저장되지 않으므로 중복 체크에 걸리지 않음
   - 동일 블랙리스트 번호로 여러 번 제출 가능 (DB 오염 없음)

2. **Submissions Count 증가 여부**
   - **권장**: 블랙리스트 제출은 카운트하지 않음 (실제 리드 아니므로)
   - **현재 구현**: Fire-and-forget 방식이므로 변경 불필요

## 🧪 테스트 시나리오

### Test Case 1: 정상 전화번호 제출
```
Input: 010-2222-3333 (블랙리스트 아님)
Expected:
  - DB에 leads 레코드 생성
  - submissions_count 증가
  - 성공 메시지 표시
  - lead_id 반환됨
```

### Test Case 2: 블랙리스트 전화번호 제출
```
Input: 010-1111-2222 (블랙리스트)
Expected:
  - DB에 leads 레코드 생성 안 됨 ✅
  - submissions_count 증가 안 됨 ✅
  - 성공 메시지 표시 (동일한 UI) ✅
  - lead_id = null 반환
  - 서버 로그에 차단 기록
```

### Test Case 3: 블랙리스트 번호 중복 제출
```
Input: 010-1111-2222 (블랙리스트) x 3회
Expected:
  - 3회 모두 성공 메시지 표시
  - DB에는 0개 레코드 생성
  - 서버 로그에 3개 차단 기록
```

### Test Case 4: 블랙리스트 + 중복 체크
```
Setup: 010-2222-3333 정상 제출 후
Input: 010-2222-3333 다시 제출
Expected:
  - "이미 신청완료 되었습니다" 에러 표시

Setup: 010-1111-2222 블랙리스트 제출 후
Input: 010-1111-2222 다시 제출
Expected:
  - 성공 메시지 표시 (중복 체크 안 걸림, DB에 없으므로)
```

## 📊 모니터링 및 분석

### 로그 쿼리 예시 (CloudWatch/Datadog)

#### 1. 시간대별 블랙리스트 차단 건수
```
event="BLACKLIST_SUBMISSION_BLOCKED"
| stats count() by bin(timestamp, 1h)
```

#### 2. 블랙리스트 번호별 시도 횟수
```
event="BLACKLIST_SUBMISSION_BLOCKED"
| stats count() by masked_phone
| sort count desc
```

#### 3. 의심스러운 IP 패턴 (같은 IP에서 여러 블랙리스트 번호)
```
event="BLACKLIST_SUBMISSION_BLOCKED"
| stats dc(masked_phone) as unique_numbers by ip_address
| where unique_numbers > 3
```

## 🔄 마이그레이션 계획

### Phase 1: 코드 변경 및 배포
1. API route 코드 수정
2. 로컬 테스트 (블랙리스트 번호로 제출)
3. Git commit & push
4. Production 배포

### Phase 2: 모니터링 및 검증
1. 배포 후 24시간 로그 모니터링
2. 블랙리스트 차단 로그 확인
3. DB에 블랙리스트 번호 저장 안 되는지 확인

### Phase 3: 성능 검증
1. 응답 시간 비교 (변경 전/후)
2. DB 쓰기 작업 감소 확인
3. 사용자 성공률 변화 확인 (403 에러 → 200 성공)

## 📋 체크리스트

### 개발 단계
- [ ] API route 코드 변경
- [ ] 로그 형식 구현
- [ ] 전화번호 마스킹 함수 추가
- [ ] 로컬 테스트 (블랙리스트 케이스)
- [ ] 로컬 테스트 (정상 케이스)

### 배포 단계
- [ ] Git commit with descriptive message
- [ ] Git push to main branch
- [ ] Production 배포 확인
- [ ] Health check (API 정상 동작 확인)

### 검증 단계
- [ ] 블랙리스트 번호로 테스트 제출
- [ ] 성공 메시지 표시 확인
- [ ] DB에 레코드 없는지 확인
- [ ] 서버 로그에 차단 기록 확인
- [ ] 정상 번호 제출 여전히 작동 확인

## 🚀 배포 후 확인사항

### 1. 즉시 확인 (배포 직후)
```bash
# 1. API 헬스 체크
curl -X POST https://your-domain.com/api/landing-pages/submit \
  -H "Content-Type: application/json" \
  -d '{"landing_page_id":"test"}'
# Expected: 400 Bad Request (정상)

# 2. 블랙리스트 번호로 테스트
# (실제 랜딩페이지에서 블랙리스트 번호 제출)
# Expected: 성공 메시지 표시
```

### 2. 24시간 이내 확인
- [ ] 서버 로그에서 `BLACKLIST_SUBMISSION_BLOCKED` 이벤트 검색
- [ ] DB에서 블랙리스트 번호 쿼리 (결과 없어야 함)
- [ ] 에러 로그 확인 (새로운 에러 없어야 함)

### 3. 1주일 이내 확인
- [ ] 블랙리스트 차단 통계 리뷰
- [ ] 정상 제출 성공률 변화 확인
- [ ] 사용자 피드백 확인

## 💡 향후 개선 방안

### 1. 관리자 대시보드 추가
```typescript
// 블랙리스트 차단 통계 표시
{
  total_blocked_attempts: 145,
  unique_blacklisted_numbers: 23,
  most_attempted_number: '010-****-1234',
  attempt_count: 12
}
```

### 2. 블랙리스트 자동 관리
- 일정 기간(예: 6개월) 후 블랙리스트에서 자동 제거
- 차단 시도 횟수 기록 → 악의성 점수 계산

### 3. 고급 패턴 탐지
- 같은 IP에서 여러 블랙리스트 번호 시도 → IP 차단
- 짧은 시간 내 반복 시도 → Rate limiting

## 📚 참고 문서

- [현재 블랙리스트 기능 설계](/Users/mh.c/medisync/claudedocs/blacklist-feature-design.md)
- [전화번호 암호화 시스템](/Users/mh.c/medisync/src/lib/encryption/phone.ts)
- [API Route 코드](/Users/mh.c/medisync/src/app/api/landing-pages/submit/route.ts)

---

**작성일**: 2025-02-24
**작성자**: Claude Code
**버전**: 1.0
