# 예약 스케줄 페이지 요구사항 명세

## 페이지 개요
**페이지명**: 예약 스케줄 (Reservation Schedule)
**라우트**: `/dashboard/reservations`
**네비게이션 위치**: DB 스케줄 바로 아래
**목적**: 계약 완료된 예약 일정 관리

---

## 1. 페이지 구조

### 1-1. 헤더 섹션
```
┌──────────────────────────────────────────────┐
│ 예약 스케줄                    총 예약 건수   │
│ 계약 완료된 예약 일정을 관리합니다      15    │
└──────────────────────────────────────────────┘
```

**구성 요소**:
- 페이지 제목: "예약 스케줄"
- 설명: "계약 완료된 예약 일정을 관리합니다"
- 총 예약 건수: 계약 완료 + contract_completed_at 있는 건수
- 그라데이션 배경: Emerald → Teal

### 1-2. 일정 리스트 섹션
날짜별로 그룹화된 예약 카드 표시

```
┌────────────────────────────────────────────────┐
│  [15]  2025년 1월 15일 수요일                   │
│  1월   3건의 예약                               │
│                                                 │
│  [10:00] 홍길동    [14:00] 김철수              │
│  📞 010-1234-5678  📞 010-2345-6789            │
│                                                 │
├────────────────────────────────────────────────┤
│  [20]  2025년 1월 20일 월요일                   │
│  1월   2건의 예약                               │
│  ...                                            │
└────────────────────────────────────────────────┘
```

---

## 2. 필터링 로직

### 2-1. 표시 대상
**조건**: `status = 'contract_completed'` AND `contract_completed_at IS NOT NULL`

```typescript
const { data: contractLeads } = await supabase
  .from('leads')
  .select('*')
  .eq('company_id', companyId)
  .eq('status', 'contract_completed')
  .not('contract_completed_at', 'is', null)
  .order('contract_completed_at', { ascending: true })
```

### 2-2. 날짜별 그룹화
- `contract_completed_at` 필드 기준으로 날짜별 그룹화
- 날짜 오름차순 정렬 (가까운 날짜가 위에)
- 같은 날짜 내에서는 시간순 정렬

---

## 3. 카드 인터랙션

### 3-1. 기본 표시
```tsx
<div className="border-2 border-gray-200 rounded-xl p-4">
  <div className="font-semibold">{lead.name}</div>
  <div className="text-xs text-gray-500">📄 {landing_page.title}</div>
</div>
```

### 3-2. 마우스 오버 시
```tsx
// 호버 상태
<div className="group hover:border-emerald-500 hover:shadow-lg">
  {/* 연락처 정보 노출 */}
  <div className="opacity-0 group-hover:opacity-100">
    📞 {decryptPhone(lead.phone)}
    {lead.custom_field_1}
  </div>
</div>
```

**표시 정보**:
- 이름 (기본 표시)
- 시간 (배지 형태로 표시)
- 랜딩페이지 제목 (기본 표시)
- 연락처 (호버 시 표시) ← **핵심 요구사항**
- 커스텀 필드 (호버 시 표시)

### 3-3. 클릭 시 동작
**이동**: DB 현황 페이지로 자동 필터링된 상태로 이동

**URL 형식**:
```
/dashboard/leads?status=contract_completed&search={lead.name}
```

**필터 적용**:
- `status`: `contract_completed` (계약 완료 상태)
- `search`: 해당 리드의 이름으로 검색

---

## 4. UI/UX 세부사항

### 4-1. 색상 시스템
```typescript
const colors = {
  primary: 'emerald', // 메인 색상
  secondary: 'teal',  // 서브 색상
  accent: 'emerald-500', // 강조 색상
}
```

**적용 위치**:
- 헤더 그라데이션: `from-emerald-500 to-teal-600`
- 카드 호버 테두리: `border-emerald-500`
- 시간 배지: `bg-emerald-500`
- 연락처 텍스트: `text-emerald-600`

### 4-2. 카드 레이아웃
**그리드 시스템**:
- Mobile: 1열 (`grid-cols-1`)
- Tablet: 2열 (`md:grid-cols-2`)
- Desktop: 3열 (`lg:grid-cols-3`)

**카드 크기**:
- 최소 높이: 자동 (내용에 맞춤)
- 패딩: `p-4`
- 간격: `gap-4`

### 4-3. 날짜 표시 형식
```typescript
// 날짜 헤더
const formattedDate = dateObj.toLocaleDateString('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})
// 결과: "2025년 1월 15일 수요일"

// 시간 배지
const time = new Date(lead.contract_completed_at).toLocaleTimeString('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
})
// 결과: "오후 2:30" 또는 "14:30"
```

---

## 5. 빈 상태 처리

### 5-1. 예약이 없을 때
```tsx
<div className="p-12 text-center">
  <div className="text-gray-400 text-lg">예약된 일정이 없습니다</div>
  <p className="text-sm text-gray-500">
    계약 완료 시 날짜/시간을 지정하면 여기에 표시됩니다
  </p>
</div>
```

### 5-2. 가이드 메시지
- DB 현황 페이지에서 계약 완료 날짜/시간 지정 필요
- 빈 상태에서도 사용자에게 명확한 가이드 제공

---

## 6. 퀵 액션 버튼

### 6-1. 모든 계약 완료 건 보기
**링크**: `/dashboard/leads?status=contract_completed`
**스타일**: 흰색 배경 + Emerald 테두리

### 6-2. 캘린더 뷰로 보기
**링크**: `/dashboard/calendar`
**스타일**: Emerald 그라데이션 배경

---

## 7. DB 스케줄 vs 예약 스케줄 차이점

| 항목 | DB 스케줄 | 예약 스케줄 |
|------|-----------|-------------|
| **표시 항목** | 4개 상태 (상담 전, 진행중, 추가상담, 기타) | 계약 완료만 |
| **필터 조건** | 상태별 필터 | `contract_completed` + 날짜 지정 |
| **주요 목적** | 상담 상태 관리 | 예약 일정 관리 |
| **연락처 표시** | - | 호버 시 표시 ✅ |
| **뷰 형태** | 캘린더 + 상태 필터 | 날짜별 리스트 |
| **색상** | Indigo/Purple | Emerald/Teal |

---

## 8. 데이터 흐름

### 8-1. 데이터 소스
```
DB 현황 페이지
  ↓
  계약 완료 상태 지정
  ↓
  contract_completed_at 날짜/시간 입력
  ↓
  예약 스케줄 페이지에 자동 표시
```

### 8-2. 필터링 흐름
```
예약 스케줄 카드 클릭
  ↓
  DB 현황 페이지로 이동
  ↓
  status=contract_completed 자동 필터
  ↓
  search={lead.name} 자동 검색
```

---

## 9. 구현 체크리스트

### Phase 1: 기본 구조 ✅
- [x] 네비게이션에 "예약 스케줄" 추가
- [x] `/dashboard/reservations` 라우트 생성
- [x] 페이지 레이아웃 및 헤더 구현

### Phase 2: 필터링 로직 ✅
- [x] 계약 완료 상태 필터링
- [x] contract_completed_at 기준 데이터 조회
- [x] 날짜별 그룹화 로직

### Phase 3: UI 컴포넌트 ✅
- [x] 날짜 헤더 디자인
- [x] 예약 카드 레이아웃
- [x] 호버 시 연락처 표시
- [x] 시간 배지 표시

### Phase 4: 인터랙션 ✅
- [x] 카드 클릭 → DB 현황 필터링 이동
- [x] 퀵 액션 버튼 구현
- [x] 빈 상태 처리

### Phase 5: 문서화 ✅
- [x] 요구사항 명세 작성
- [x] UI/UX 가이드 문서화
- [x] 데이터 흐름 정리

---

## 10. 기술 스택

- **Framework**: Next.js 14 (Server Components)
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS
- **Encryption**: Phone decryption utility
- **Type Safety**: TypeScript

---

## 11. 보안 고려사항

### 11-1. 연락처 암호화
- `decryptPhone()` 함수를 통한 복호화
- 호버 시에만 표시하여 정보 노출 최소화

### 11-2. 권한 관리
- `company_id` 기반 데이터 필터링
- 본인 회사 데이터만 조회 가능

---

## 12. 향후 개선 사항

### 12-1. 기능 확장
- [ ] 예약 일정 수정/삭제 기능
- [ ] 예약 알림 기능 (푸시, 이메일, SMS)
- [ ] 예약 메모 추가 기능
- [ ] 드래그 앤 드롭으로 일정 변경

### 12-2. UX 개선
- [ ] 오늘 날짜 하이라이트
- [ ] 지나간 예약 회색 처리
- [ ] 예약 밀도 시각화 (많은 날짜 강조)
- [ ] 월별 뷰 추가

### 12-3. 통합 기능
- [ ] Google Calendar 연동
- [ ] iCal 내보내기
- [ ] 카카오톡 알림톡 발송
