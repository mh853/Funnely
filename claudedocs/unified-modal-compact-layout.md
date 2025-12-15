# UnifiedDetailModal 컴팩트 레이아웃 설계

## 1. 현재 상태 분석

### 1.1 DB 신청 상세내용 섹션
**현재 구현 상태**: 모든 필드가 이미 구현되어 있음 ✅
- 랜딩페이지 (lines 534-554)
- 기기 (lines 555-560)
- 선택항목 (lines 561-575)
- 단답형 항목 (lines 576-585)
- 뭐가 궁금하신가요 (lines 586-593)

**데이터 표시 조건**: 각 필드는 데이터가 있을 때만 표시됨 (conditional rendering)

### 1.2 현재 Spacing 분석

#### 전체 모달 구조
```jsx
<Dialog.Panel className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl">
  {/* Header - py-6 px-6 */}

  {/* 담당자 선택 - px-6 py-4 */}

  {/* 2열 레이아웃 - gap-6 p-6 */}
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">

    {/* 왼쪽 열 - space-y-6 */}
    <div className="lg:col-span-3 space-y-6">

      {/* DB 신청 내용 - p-5 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">DB 신청 내용</h3>
        <dl className="space-y-3">...</dl>
      </div>

      {/* 결과 - p-5, mb-4 */}

      {/* 예약일 - p-5, mb-4 */}

      {/* DB 신청 상세내용 - p-5 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">DB 신청 상세내용</h3>
        <dl className="space-y-3">...</dl>
      </div>
    </div>

    {/* 오른쪽 열 - space-y-6 */}
    <div className="lg:col-span-2 space-y-6">...</div>
  </div>
</Dialog.Panel>
```

#### 문제점
1. **과도한 패딩**: `p-5` (20px), `p-6` (24px) → 너무 넓음
2. **큰 간격**: `space-y-6` (24px), `gap-6` (24px) → 수직 공간 낭비
3. **제목 마진**: `mb-4` (16px) → 섹션 제목과 내용 사이 간격이 큼
4. **항목 간격**: `space-y-3` (12px) → dl 항목 간격이 넓음

## 2. 컴팩트 레이아웃 설계

### 2.1 Spacing 최적화 전략

#### Before vs After
```
Before:
- p-6 (24px) → After: p-4 (16px)  [-33%]
- p-5 (20px) → After: p-3 (12px)  [-40%]
- space-y-6 (24px) → After: space-y-3 (12px)  [-50%]
- gap-6 (24px) → After: gap-4 (16px)  [-33%]
- mb-4 (16px) → After: mb-2 (8px)  [-50%]
- space-y-3 (12px) → After: space-y-2 (8px)  [-33%]
- py-4 (16px) → After: py-2 (8px)  [-50%]
```

### 2.2 변경 사항 상세

#### 1. 전체 레이아웃 컨테이너
```jsx
// Before: gap-6 p-6
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">

// After: gap-4 p-4
<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4">
```

#### 2. 좌우 열 간격
```jsx
// Before: space-y-6
<div className="lg:col-span-3 space-y-6">

// After: space-y-3
<div className="lg:col-span-3 space-y-3">
```

#### 3. 섹션 카드 패딩
```jsx
// Before: p-5
<div className="bg-white border-2 border-gray-200 rounded-xl p-5">

// After: p-3
<div className="bg-white border-2 border-gray-200 rounded-xl p-3">
```

#### 4. 섹션 제목 마진
```jsx
// Before: mb-4
<h3 className="text-base font-bold text-gray-900 mb-4">

// After: mb-2
<h3 className="text-base font-bold text-gray-900 mb-2">
```

#### 5. dl 항목 간격
```jsx
// Before: space-y-3
<dl className="space-y-3">

// After: space-y-2
<dl className="space-y-2">
```

#### 6. dt/dd 마진
```jsx
// Before: mt-1
<dd className="mt-1 text-sm text-gray-900">

// After: mt-0.5
<dd className="mt-0.5 text-sm text-gray-900">
```

#### 7. 담당자 선택 영역
```jsx
// Before: px-6 py-4
<div className="px-6 py-4 bg-gray-50 border-b border-gray-200">

// After: px-4 py-2
<div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
```

#### 8. 결제 내역 항목
```jsx
// Before: p-3, space-y-2, mb-4
<div className="space-y-2 mb-4">
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">

// After: p-2, space-y-1, mb-2
<div className="space-y-1 mb-2">
  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
```

#### 9. 변경이력 항목
```jsx
// Before: p-3, space-y-3
<div className="space-y-3">
  <div className="p-3 bg-gray-50 rounded-lg border-l-4">

// After: p-2, space-y-2
<div className="space-y-2">
  <div className="p-2 bg-gray-50 rounded-lg border-l-4">
```

#### 10. 결제 추가 폼
```jsx
// Before: space-y-2 mb-4
<div className="space-y-2 mb-4">

// After: space-y-1 mb-2
<div className="space-y-1 mb-2">
```

### 2.3 예상 효과

#### 수직 공간 절약
```
섹션 카드 패딩: 20px → 12px = -8px × 5개 섹션 = -40px
섹션 간 간격: 24px → 12px = -12px × 4개 간격 = -48px
제목 마진: 16px → 8px = -8px × 5개 제목 = -40px
항목 간격: 평균 -4px × ~20개 항목 = -80px
담당자 영역: 16px → 8px = -8px

총 예상 절약: ~216px (약 30% 수직 공간 절약)
```

## 3. 구현 체크리스트

### 3.1 필수 변경 사항
- [ ] 전체 레이아웃 컨테이너: `gap-6 p-6` → `gap-4 p-4`
- [ ] 좌우 열: `space-y-6` → `space-y-3`
- [ ] 섹션 카드: `p-5` → `p-3`
- [ ] 섹션 제목: `mb-4` → `mb-2`
- [ ] dl 간격: `space-y-3` → `space-y-2`
- [ ] dd 마진: `mt-1` → `mt-0.5`
- [ ] 담당자 영역: `px-6 py-4` → `px-4 py-2`
- [ ] 결제 항목: `p-3 space-y-2 mb-4` → `p-2 space-y-1 mb-2`
- [ ] 변경이력 항목: `p-3 space-y-3` → `p-2 space-y-2`
- [ ] 결제 폼: `space-y-2 mb-4` → `space-y-1 mb-2`

### 3.2 검증 사항
- [ ] 텍스트 가독성 유지 확인
- [ ] 클릭 가능한 영역 확보 확인
- [ ] 모바일 반응형 레이아웃 확인
- [ ] 전체 모달 높이 감소 확인

## 4. 데이터 표시 확인 사항

### 4.1 API 응답 확인
LeadData 인터페이스에 모든 필드가 정의되어 있음:
```typescript
device?: string | null
consultation_items?: string[] | null
custom_fields?: Array<{ label: string; value: string }> | null
message?: string | null
```

### 4.2 조건부 렌더링
모든 필드는 데이터가 있을 때만 표시:
```jsx
{lead.device && <div>...</div>}
{lead.consultation_items && lead.consultation_items.length > 0 && <div>...</div>}
{lead.custom_fields && lead.custom_fields.length > 0 && <div>...</div>}
{lead.message && <div>...</div>}
```

### 4.3 확인 필요 사항
실제 데이터가 DB에서 올바르게 가져와지는지 확인:
1. calendar/page.tsx의 leads 쿼리 확인
2. reservations 페이지의 leads 쿼리 확인
3. DB 테이블에 실제 데이터 존재 여부 확인

## 5. 구현 순서

1. **UnifiedDetailModal.tsx 수정**: 모든 spacing 클래스 변경
2. **빌드 테스트**: 타입 에러 및 문법 에러 확인
3. **시각적 검증**: 브라우저에서 레이아웃 확인
4. **데이터 확인**: 실제 DB 데이터가 모두 표시되는지 확인
5. **완료 보고**: 변경 사항 및 효과 정리
