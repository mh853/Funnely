# 외부 수집 폼 모달 미리보기 설계

## 개요

옵션2(외부 페이지 수집) 선택 시, CTA 버튼 클릭으로 표시될 확장 정보 수집 모달의 미리보기 기능을 설계합니다.

## 기능 요구사항

### 1. 모달 트리거
- **트리거**: 미리보기에서 CTA 버튼 클릭
- **조건**: `collectionMode === 'external'` 일 때만 활성화
- **동작**: 전체화면 모달 오픈 (데스크탑/모바일 미리보기 모두 지원)

### 2. 모달 콘텐츠
- **제목**: 외부 수집 페이지 제목 (`external_page_slug` 기반)
- **설명**: "상세한 정보를 입력해주시면 맞춤 상담을 도와드립니다"
- **폼 필드**: 확장된 정보 수집 항목
- **제출 버튼**: "신청하기" (미리보기에서는 알림만 표시)

### 3. 수집 필드 구성

#### 기본 필드 (필수)
1. **이름** (text, required)
2. **연락처** (tel, required)

#### 확장 필드 (선택)
3. **이메일** (email, optional)
4. **주소** (text, optional)
5. **생년월일** (date, optional)
6. **성별** (select: 남성/여성, optional)
7. **상담 유형** (select, optional) - 설정 가능한 옵션
8. **상세 메시지** (textarea, optional)

#### 개인정보 동의 (필수)
- 개인정보 수집·이용 동의 체크박스
- 마케팅 활용 동의 체크박스 (선택)

## UI 컴포넌트 구조

### State 관리
```typescript
// 모달 상태
const [showExternalFormModal, setShowExternalFormModal] = useState(false)

// 외부 폼 필드 설정 (설정 화면에서 관리)
const [externalFormFields, setExternalFormFields] = useState({
  includeEmail: true,
  includeAddress: true,
  includeBirthDate: false,
  includeGender: false,
  consultationTypes: ['일반 상담', '전문 상담', '긴급 상담']
})
```

### 모달 레이아웃
```
┌─────────────────────────────────────────────┐
│  ✕                                          │
│                                             │
│  상세 상담 신청                              │
│  상세한 정보를 입력해주시면 맞춤 상담을      │
│  도와드립니다                                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 이름 *                               │   │
│  │ [              ]                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 연락처 *                             │   │
│  │ [              ]                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 이메일                               │   │
│  │ [              ]                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 주소                                 │   │
│  │ [              ]                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 상담 유형                            │   │
│  │ [일반 상담 ▼]                        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 상세 메시지                          │   │
│  │ [                                   ]│   │
│  │ [                                   ]│   │
│  │ [                                   ]│   │
│  └─────────────────────────────────────┘   │
│                                             │
│  □ 개인정보 수집·이용 동의 (필수) [보기]    │
│  □ 마케팅 활용 동의 (선택) [보기]          │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         신청하기                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

## 설정 UI 추가

### DB 수집 항목 섹션에 외부 폼 설정 추가

```typescript
{collectionMode === 'external' && (
  <div className="bg-purple-50 rounded-xl p-4 space-y-4 mt-4">
    <h3 className="text-sm font-bold text-gray-900 mb-3">
      외부 폼 수집 항목 설정
    </h3>

    <p className="text-xs text-gray-600 mb-4">
      CTA 버튼 클릭 시 표시될 확장 정보 수집 항목을 선택하세요
    </p>

    {/* 기본 필드는 항상 수집 */}
    <div className="text-xs text-gray-500 mb-2">
      ✓ 이름, 연락처 (기본 필수 항목)
    </div>

    {/* 선택 가능한 확장 필드 */}
    <div className="grid grid-cols-2 gap-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={externalFormFields.includeEmail}
          onChange={(e) => setExternalFormFields({
            ...externalFormFields,
            includeEmail: e.target.checked
          })}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">이메일</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={externalFormFields.includeAddress}
          onChange={(e) => setExternalFormFields({
            ...externalFormFields,
            includeAddress: e.target.checked
          })}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">주소</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={externalFormFields.includeBirthDate}
          onChange={(e) => setExternalFormFields({
            ...externalFormFields,
            includeBirthDate: e.target.checked
          })}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">생년월일</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={externalFormFields.includeGender}
          onChange={(e) => setExternalFormFields({
            ...externalFormFields,
            includeGender: e.target.checked
          })}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">성별</span>
      </label>
    </div>

    {/* 상담 유형 설정 */}
    <div className="space-y-2 pt-3 border-t border-purple-200">
      <label className="block text-sm font-medium text-gray-700">
        상담 유형 옵션 (쉼표로 구분)
      </label>
      <input
        type="text"
        value={externalFormFields.consultationTypes.join(', ')}
        onChange={(e) => setExternalFormFields({
          ...externalFormFields,
          consultationTypes: e.target.value.split(',').map(s => s.trim())
        })}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
        placeholder="일반 상담, 전문 상담, 긴급 상담"
      />
    </div>
  </div>
)}
```

## 미리보기 모달 컴포넌트

### 모달 렌더링 (모바일 & 데스크탑 공통)
```typescript
const renderExternalFormModal = () => {
  if (!showExternalFormModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            상세 상담 신청
          </h2>
          <button
            onClick={() => setShowExternalFormModal(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Description */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <p className="text-sm text-gray-700 text-center">
            상세한 정보를 입력해주시면 맞춤 상담을 도와드립니다
          </p>
        </div>

        {/* Form Fields */}
        <div className="p-6 space-y-4">
          {/* 이름 (필수) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
              placeholder="홍길동"
            />
          </div>

          {/* 연락처 (필수) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연락처 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
              placeholder="010-1234-5678"
            />
          </div>

          {/* 이메일 (선택) */}
          {externalFormFields.includeEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                disabled
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
                placeholder="example@email.com"
              />
            </div>
          )}

          {/* 주소 (선택) */}
          {externalFormFields.includeAddress && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주소
              </label>
              <input
                type="text"
                disabled
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
                placeholder="서울시 강남구..."
              />
            </div>
          )}

          {/* 생년월일 (선택) */}
          {externalFormFields.includeBirthDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                생년월일
              </label>
              <input
                type="date"
                disabled
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
              />
            </div>
          )}

          {/* 성별 (선택) */}
          {externalFormFields.includeGender && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                성별
              </label>
              <select
                disabled
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
              >
                <option>선택하세요</option>
                <option>남성</option>
                <option>여성</option>
              </select>
            </div>
          )}

          {/* 상담 유형 (선택) */}
          {externalFormFields.consultationTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상담 유형
              </label>
              <select
                disabled
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
              >
                <option>선택하세요</option>
                {externalFormFields.consultationTypes.map((type, idx) => (
                  <option key={idx}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {/* 상세 메시지 (선택) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상세 메시지
            </label>
            <textarea
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 resize-none"
              rows={4}
              placeholder="상담 받고 싶은 내용을 자세히 적어주세요"
            />
          </div>

          {/* 개인정보 동의 */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            {requirePrivacyConsent && (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  disabled
                  className="mt-1 w-4 h-4 rounded border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  개인정보 수집·이용 동의 (필수)
                  <button className="ml-1 text-indigo-600 underline">[보기]</button>
                </span>
              </label>
            )}
            {requireMarketingConsent && (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  disabled
                  className="mt-1 w-4 h-4 rounded border-gray-300"
                />
                <span className="text-xs text-gray-600">
                  마케팅 활용 동의 (선택)
                  <button className="ml-1 text-indigo-600 underline">[보기]</button>
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={() => {
              alert('미리보기 모드입니다')
              setShowExternalFormModal(false)
            }}
            className="w-full py-4 rounded-xl font-bold text-white shadow-lg"
            style={{ backgroundColor: ctaColor }}
          >
            신청하기
          </button>
        </div>
      </div>
    </div>
  )
}
```

### CTA 버튼에 클릭 이벤트 추가
```typescript
case 'cta_button':
  if (!ctaEnabled || !collectData) return null
  return (
    <div className="flex justify-center">
      <button
        onClick={() => {
          if (collectionMode === 'external') {
            setShowExternalFormModal(true)
          }
        }}
        className="w-full py-3 rounded-lg text-sm font-bold text-white shadow-lg"
        style={{ backgroundColor: ctaColor }}
      >
        {ctaText || '상담 신청하기'}
      </button>
    </div>
  )
```

## 데이터 저장 (handleSave 업데이트)

```typescript
const { error: insertError } = await supabase
  .from('landing_pages')
  .insert({
    // ... 기존 필드들
    collection_mode: collectionMode,
    external_page_slug: collectionMode === 'external' ? externalPageSlug : null,
    external_page_params: collectionMode === 'external' ? externalPageParams : null,
    external_form_fields: collectionMode === 'external' ? externalFormFields : null, // 추가
    // ...
  })
```

## 데이터베이스 스키마 업데이트 필요

### landing_pages 테이블에 컬럼 추가
```sql
ALTER TABLE landing_pages
ADD COLUMN external_form_fields JSONB DEFAULT '{
  "includeEmail": true,
  "includeAddress": true,
  "includeBirthDate": false,
  "includeGender": false,
  "consultationTypes": ["일반 상담", "전문 상담", "긴급 상담"]
}';

COMMENT ON COLUMN landing_pages.external_form_fields IS '외부 폼 수집 필드 설정 (collection_mode=external일 때 사용)';
```

## 사용자 경험 흐름

### 옵션1 (페이지 내 수집)
1. 랜딩 페이지 방문
2. 페이지 내 폼 직접 입력
3. 즉시 제출

### 옵션2 (외부 페이지 수집)
1. 랜딩 페이지 방문
2. **CTA 버튼 클릭** → 모달 폼 오픈
3. **확장 정보 입력** (이메일, 주소, 생년월일 등)
4. 제출 → 외부 수집 페이지로 리드 저장

## 미리보기 시뮬레이션

### 모바일 미리보기
- CTA 버튼 클릭 → 전체화면 모달 오픈
- 모달 내 폼 필드 미리보기
- 닫기 버튼으로 모달 닫기

### 데스크탑 미리보기 (모달)
- 동일한 외부 폼 모달 표시
- 중앙 정렬된 모달 레이아웃
- 오버레이 클릭으로 닫기

## 구현 우선순위

1. ✅ **State 추가**: `showExternalFormModal`, `externalFormFields`
2. ✅ **설정 UI**: 외부 폼 필드 선택 체크박스 및 상담 유형 설정
3. ✅ **모달 컴포넌트**: `renderExternalFormModal()` 함수 작성
4. ✅ **CTA 버튼 연결**: onClick 이벤트로 모달 오픈
5. ✅ **DB 저장**: `external_form_fields` 필드 추가 및 저장 로직
6. ⏳ **DB 마이그레이션**: `landing_pages` 테이블 스키마 업데이트

## 결론

이 설계를 통해 사용자는:
- 옵션2 선택 시 외부 폼의 모습을 미리보기에서 확인 가능
- 수집할 확장 필드를 설정 화면에서 선택 가능
- 실제 모달 동작을 시뮬레이션하여 최종 UX 확인 가능
- 랜딩 페이지 저장 전에 모든 요소를 미리 검증 가능

다음 단계는 이 설계를 바탕으로 실제 구현을 진행하는 것입니다.
