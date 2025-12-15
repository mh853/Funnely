# DB 신청 상세내용 UTM 및 추적 정보 추가

## 1. 작업 개요

**사용자 요청**: "스샷을 보면 왼쪽 아래의 db신청상세내용 부분을 보면 랜딩페이지 타이틀만 보이고 있어. 이 영역에 기기 정보, 비고, utm들의 정보를 출력해줘."

**작업 완료 일시**: 2025-12-15

## 2. 구현 내용

### 2.1 LeadData 인터페이스 확장

**파일**: [src/components/shared/UnifiedDetailModal.tsx](../src/components/shared/UnifiedDetailModal.tsx)

**추가된 필드들** (lines 42-47):
```typescript
interface LeadData {
  // ... 기존 필드들
  notes?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  referrer?: string | null
}
```

### 2.2 DB 신청 상세내용 섹션 업데이트

**파일**: [src/components/shared/UnifiedDetailModal.tsx](../src/components/shared/UnifiedDetailModal.tsx)

**추가된 정보 표시** (lines 600-656):

#### A. 비고 (Notes) 섹션
```typescript
{lead.notes && (
  <div>
    <dt className="text-sm font-medium text-gray-500">비고</dt>
    <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-wrap">
      {lead.notes}
    </dd>
  </div>
)}
```

**위치**: 메시지 필드 다음
**스타일**: 여러 줄 표시 가능 (whitespace-pre-wrap)

#### B. UTM 파라미터 섹션
```typescript
{(lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.utm_content || lead.utm_term) && (
  <div className="pt-2 border-t border-gray-100">
    <dt className="text-sm font-medium text-gray-700 mb-1">유입 경로 (UTM)</dt>
    <dd className="space-y-1">
      {lead.utm_source && (
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-gray-500 min-w-[60px]">Source:</span>
          <span className="text-xs text-gray-900">{lead.utm_source}</span>
        </div>
      )}
      {/* utm_medium, utm_campaign, utm_content, utm_term 동일 패턴 */}
    </dd>
  </div>
)}
```

**특징**:
- UTM 파라미터가 하나라도 있을 때만 섹션 표시
- 상단에 구분선 추가 (border-t)
- 각 UTM 파라미터를 라벨-값 쌍으로 표시
- 라벨은 60px 고정폭으로 정렬

**표시 항목**:
1. **Source**: utm_source 값
2. **Medium**: utm_medium 값
3. **Campaign**: utm_campaign 값
4. **Content**: utm_content 값
5. **Term**: utm_term 값

#### C. Referrer 정보 섹션
```typescript
{lead.referrer && (
  <div>
    <dt className="text-sm font-medium text-gray-500">Referrer</dt>
    <dd className="mt-0.5 text-xs text-gray-700 break-all">
      {lead.referrer}
    </dd>
  </div>
)}
```

**특징**:
- Referrer URL이 있을 때만 표시
- `break-all`로 긴 URL도 줄바꿈하여 표시
- 작은 폰트(text-xs)로 깔끔하게 표시

## 3. 표시 순서

**DB 신청 상세내용 섹션 내 항목 순서**:
1. 랜딩페이지
2. 기기 (device)
3. 선택항목 (consultation_items)
4. 단답형 항목 (custom_fields)
5. 뭐가 궁금하신가요 (message)
6. **비고 (notes)** ← 새로 추가
7. **유입 경로 (UTM)** ← 새로 추가 (구분선 있음)
   - Source
   - Medium
   - Campaign
   - Content
   - Term
8. **Referrer** ← 새로 추가

## 4. 스타일링 특징

### 4.1 일관성 유지
- 기존 섹션과 동일한 `space-y-2` 간격 사용
- `text-sm` 폰트 크기로 통일
- `text-gray-500` 라벨, `text-gray-900` 값 색상 유지

### 4.2 UTM 섹션 차별화
- 상단 `border-t border-gray-100` 구분선으로 시각적 구분
- `pt-2`로 위쪽 패딩 추가
- 라벨을 약간 더 강조 (`text-gray-700`)
- 값은 작은 폰트(`text-xs`)로 정보 밀도 향상

### 4.3 Referrer URL 처리
- `text-xs`로 작게 표시하여 공간 절약
- `break-all`로 긴 URL도 보기 좋게 줄바꿈
- `text-gray-700`로 약간 연한 색상

## 5. 조건부 렌더링

모든 새로 추가된 필드는 **조건부 렌더링**으로 구현:
- 데이터가 없으면 섹션 자체가 표시되지 않음
- UTM 섹션은 5개 파라미터 중 하나라도 있으면 표시
- 빈 공간이 생기지 않아 깔끔한 레이아웃 유지

## 6. 데이터 흐름

### 6.1 데이터베이스 스키마
leads 테이블에는 이미 다음 필드들이 존재:
```sql
-- 기본 정보
device VARCHAR

-- 추적 정보
utm_source VARCHAR
utm_medium VARCHAR
utm_campaign VARCHAR
utm_content VARCHAR
utm_term VARCHAR
referrer TEXT

-- 비고
notes TEXT
```

### 6.2 데이터 조회
Calendar 페이지는 `*`를 사용하여 모든 필드 자동 조회:
```typescript
.select(`
  *,
  landing_pages (id, title, slug),
  call_assigned_user:users!leads_call_assigned_to_fkey(id, full_name),
  counselor_assigned_user:users!leads_counselor_assigned_to_fkey(id, full_name)
`)
```

따라서 추가 쿼리 수정 없이 자동으로 UTM, referrer, notes 데이터가 포함됨.

## 7. 빌드 검증

**명령어**: `npm run build`

**결과**: ✅ 성공 (타입 에러 없음)
- Calendar 페이지: 174 kB (1 kB 증가)
- Leads 페이지: 240 kB (동일)
- 전체 빌드: 오류 없음

## 8. 시각적 레이아웃

### Before (기존)
```
┌─────────────────────────┐
│ DB 신청 상세내용         │
├─────────────────────────┤
│ 랜딩페이지: 테스트4      │ ← 링크
│                          │
│ (다른 필드들...)         │
└─────────────────────────┘
```

### After (개선 후)
```
┌─────────────────────────┐
│ DB 신청 상세내용         │
├─────────────────────────┤
│ 랜딩페이지: 테스트4      │ ← 링크
│ 기기: Mobile             │
│ 선택항목: [태그1] [태그2]│
│ 질문1: 답변1             │
│ 뭐가 궁금하신가요: 내용  │
│ 비고: 특이사항 메모      │ ← 새로 추가
├─────────────────────────┤ ← 구분선
│ 유입 경로 (UTM)          │ ← 새로 추가
│   Source: google         │
│   Medium: cpc            │
│   Campaign: winter_sale  │
│   Content: ad_variant_a  │
│   Term: 성형외과         │
├─────────────────────────┤
│ Referrer                 │ ← 새로 추가
│ https://google.com/...   │
└─────────────────────────┘
```

## 9. 사용자 경험 개선

### 9.1 정보 완전성
- ✅ 기기 정보로 모바일/PC 유입 파악 가능
- ✅ UTM 파라미터로 마케팅 캠페인 추적 가능
- ✅ Referrer로 유입 출처 확인 가능
- ✅ 비고로 추가 메모 확인 가능

### 9.2 가독성
- ✅ UTM 섹션은 구분선으로 시각적 분리
- ✅ 라벨-값 정렬로 스캔하기 쉬움
- ✅ 조건부 렌더링으로 빈 공간 없음
- ✅ 컴팩트한 레이아웃 유지 (text-xs 활용)

### 9.3 분석 효율성
- ✅ 마케팅 담당자: UTM으로 캠페인 성과 즉시 확인
- ✅ 영업 담당자: 기기 정보로 고객 환경 파악
- ✅ 관리자: Referrer로 유입 경로 분석
- ✅ 모든 사용자: 비고로 중요 메모 확인

## 10. 향후 개선 사항

### 10.1 즉시 가능한 개선
1. **UTM 하이라이트**: 특정 캠페인을 색상으로 강조
2. **Referrer 도메인 추출**: 전체 URL 대신 도메인만 표시
3. **기기 아이콘**: Mobile/PC 텍스트 대신 아이콘 사용

### 10.2 장기 개선 사항
1. **UTM 통계**: 동일 UTM으로 유입된 리드 수 표시
2. **Referrer 분석**: 주요 유입 경로 통계 제공
3. **비고 편집**: 모달 내에서 비고 수정 기능

## 11. 변경 파일 목록

1. **[src/components/shared/UnifiedDetailModal.tsx](../src/components/shared/UnifiedDetailModal.tsx)**
   - Lines 42-47: LeadData 인터페이스에 utm, referrer, notes 필드 추가
   - Lines 600-656: DB 신청 상세내용 섹션에 표시 로직 추가

## 12. 검증 체크리스트

- ✅ LeadData 인터페이스 확장 (utm, referrer, notes)
- ✅ 비고 섹션 추가 (whitespace-pre-wrap)
- ✅ UTM 파라미터 섹션 추가 (구분선, 정렬)
- ✅ Referrer 섹션 추가 (break-all)
- ✅ 조건부 렌더링 구현
- ✅ 빌드 성공 (타입 에러 없음)
- ✅ 기존 기능 보존
- ✅ 컴팩트 레이아웃 유지

## 13. 결론

✅ **모든 요구사항 완료**:
1. 기기 정보 표시 ✅
2. 비고 필드 표시 ✅
3. UTM 파라미터 (source, medium, campaign, content, term) 표시 ✅
4. Referrer 정보 표시 ✅

**주요 성과**:
- 📊 마케팅 추적 정보 완전 표시
- 🎨 깔끔한 레이아웃 유지 (구분선, 정렬)
- 🔍 조건부 렌더링으로 빈 공간 제거
- 💯 빌드 성공 (타입 에러 없음)

**사용자 피드백 반영**:
- ✅ "랜딩페이지 타이틀만 보인다" → 기기, 비고, UTM 모두 추가
- ✅ 컴팩트 레이아웃 유지 → 작은 폰트, 구분선 활용
- ✅ 정보 밀도 향상 → 라벨-값 정렬, 조건부 렌더링
