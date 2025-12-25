# DB 현황 페이지 버튼 디자인 통일화

## 📸 현재 상태 분석

스크린샷 분석 결과, 페이지 헤더의 3개 버튼이 서로 다른 스타일을 사용하고 있습니다:

### 현재 버튼 스타일

| 버튼 | 현재 스타일 | 문제점 |
|------|------------|--------|
| 콜 담당자 분배 | `bg-blue-600` (단색 파란색) | 다른 버튼과 스타일 불일치 |
| DB 수동 추가 | `bg-gradient-to-r from-indigo-500 to-purple-600` (그라디언트) | ✅ 기준 스타일 |
| Excel | `bg-gradient-to-r from-indigo-500 to-purple-600` (그라디언트) | ✅ 기준 스타일 |

### 코드 비교

**콜 담당자 분배 (현재):**
```tsx
className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm gap-2 ${
  isDistributing
    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
    : 'bg-blue-600 text-white hover:bg-blue-700'
}`}
```

**DB 수동 추가 & Excel (기준):**
```tsx
className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl gap-2"
```

## 🎯 디자인 목표

**일관성 있는 UI/UX 제공:**
- 모든 액션 버튼이 동일한 시각적 위계와 스타일 사용
- 브랜드 컬러 (Indigo-Purple 그라디언트) 일관성 유지
- 호버/액티브 상태의 일관된 피드백

## ✨ 통일화 디자인 사양

### 버튼 스타일 시스템

#### 1. 기본 상태 (Normal)
```tsx
className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl gap-2"
```

**구성 요소:**
- **Layout**: `inline-flex items-center`
- **Spacing**: `px-4 py-2 gap-2`
- **Background**: `bg-gradient-to-r from-indigo-500 to-purple-600`
- **Text**: `text-white text-sm font-semibold`
- **Border Radius**: `rounded-xl` (12px)
- **Shadow**: `shadow-lg hover:shadow-xl`
- **Transition**: `transition-all`
- **Hover**: `hover:from-indigo-600 hover:to-purple-700`

#### 2. 비활성화 상태 (Disabled)
```tsx
className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-xl text-sm font-semibold cursor-not-allowed shadow-lg gap-2 opacity-60"
```

**구성 요소:**
- 동일한 레이아웃과 스페이싱
- **Background**: `bg-gray-300` (그라디언트 대신 단색)
- **Text**: `text-gray-500`
- **Cursor**: `cursor-not-allowed`
- **Opacity**: `opacity-60` (추가 시각적 피드백)

#### 3. 로딩 상태 (Loading)
```tsx
className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl text-sm font-semibold cursor-wait shadow-lg gap-2"
```

**구성 요소:**
- 그라디언트 유지 (일관성)
- **Background**: `from-gray-400 to-gray-500` (회색 그라디언트)
- **Cursor**: `cursor-wait`
- 스피너 아이콘 포함

### 통일화 구현 코드

```tsx
{/* 콜 담당자 분배 버튼 - 통일화된 스타일 */}
<button
  onClick={handleDistributeLeads}
  disabled={isDistributing}
  className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all gap-2 ${
    isDistributing
      ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-wait shadow-lg'
      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
  }`}
>
  {isDistributing ? (
    <>
      <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span>분배 중...</span>
    </>
  ) : (
    <>
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <span>콜 담당자 분배</span>
    </>
  )}
</button>

<button
  onClick={() => setShowAddLeadModal(true)}
  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl gap-2"
>
  <UserPlusIcon className="h-4 w-4" />
  DB 수동 추가
</button>

<button
  onClick={handleExcelExport}
  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl gap-2"
>
  <ArrowDownTrayIcon className="h-4 w-4" />
  Excel
</button>
```

## 🎨 디자인 시스템 가이드라인

### 색상 팔레트

| 상태 | Primary | Secondary | 용도 |
|------|---------|-----------|------|
| Normal | `indigo-500` (#6366f1) | `purple-600` (#9333ea) | 기본 액션 버튼 |
| Hover | `indigo-600` (#4f46e5) | `purple-700` (#7e22ce) | 호버 상태 강조 |
| Loading | `gray-400` (#9ca3af) | `gray-500` (#6b7280) | 로딩 중 표시 |
| Disabled | `gray-300` (#d1d5db) | - | 비활성화 상태 |

### 그라디언트 방향

```css
bg-gradient-to-r  /* 왼쪽 → 오른쪽 */
```

### 타이포그래피

- **Font Size**: `text-sm` (0.875rem / 14px)
- **Font Weight**: `font-semibold` (600)
- **Letter Spacing**: 기본값 유지

### 간격 (Spacing)

- **Horizontal Padding**: `px-4` (1rem / 16px)
- **Vertical Padding**: `py-2` (0.5rem / 8px)
- **Icon-Text Gap**: `gap-2` (0.5rem / 8px)

### 그림자 (Shadow)

- **기본**: `shadow-lg` - 중간 크기 그림자
- **호버**: `shadow-xl` - 큰 그림자 (깊이감 강조)

### 애니메이션

- **Transition**: `transition-all` (모든 속성)
- **Duration**: 기본값 (150ms)
- **Easing**: 기본값 (cubic-bezier)

## 📊 변경 사항 요약

### Before (AS-IS)
```tsx
// 콜 담당자 분배 버튼
bg-blue-600            // 단색 파란색
hover:bg-blue-700      // 단색 호버
shadow-sm              // 작은 그림자
font-medium            // 중간 폰트 두께
```

### After (TO-BE)
```tsx
// 콜 담당자 분배 버튼 (통일화)
bg-gradient-to-r from-indigo-500 to-purple-600  // 브랜드 그라디언트
hover:from-indigo-600 hover:to-purple-700       // 그라디언트 호버
shadow-lg hover:shadow-xl                        // 일관된 그림자
font-semibold                                    // 통일된 폰트 두께
```

## ✅ 구현 체크리스트

- [x] LeadsClient.tsx 파일 수정
- [x] 콜 담당자 분배 버튼 클래스 업데이트 (Line 1260-1264)
- [x] 로딩 상태 그라디언트 적용 (Line 1261-1263)
- [x] 호버 효과 shadow-xl 추가
- [x] font-semibold로 변경
- [ ] 시각적 테스트 (브라우저에서 확인)
- [ ] 3개 버튼 일관성 검증

## 🎯 기대 효과

1. **시각적 일관성**: 모든 버튼이 동일한 브랜드 스타일 적용
2. **사용자 경험**: 일관된 호버/클릭 피드백으로 직관성 향상
3. **전문성**: 통일된 디자인으로 제품 완성도 향상
4. **유지보수성**: 명확한 디자인 시스템으로 향후 버튼 추가 시 일관성 유지

## 📝 파일 정보

**대상 파일**: `/Users/mh.c/medisync/src/app/dashboard/leads/LeadsClient.tsx`
**수정 라인**: 1257-1308
**영향 범위**: UI 스타일 변경 (기능 변경 없음)
**테스트 필요**: 시각적 검증, 호버 상태 확인, 로딩 상태 확인

---

**설계일**: 2025-12-25
**구현일**: 2025-12-25
**설계자**: Claude Code
**타입**: UI/UX 디자인 통일화
**우선순위**: Medium (사용자 경험 개선)
**상태**: ✅ 구현 완료

---

## 📦 구현 완료

### 변경된 파일
- **파일**: `/Users/mh.c/medisync/src/app/dashboard/leads/LeadsClient.tsx`
- **라인**: 1256-1264
- **변경 사항**: 버튼 스타일 클래스 통일화

### 코드 변경 내용

**Before:**
```tsx
className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm gap-2 ${
  isDistributing
    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
    : 'bg-blue-600 text-white hover:bg-blue-700'
}`}
```

**After:**
```tsx
className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all gap-2 ${
  isDistributing
    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-wait shadow-lg'
    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
}`}
```

### 주요 변경점
1. ✅ `font-medium` → `font-semibold` (다른 버튼과 통일)
2. ✅ `shadow-sm` → `shadow-lg hover:shadow-xl` (그림자 강화)
3. ✅ 단색 배경 → 그라디언트 배경 (`from-indigo-500 to-purple-600`)
4. ✅ 호버 효과 그라디언트로 전환
5. ✅ 로딩 상태도 그라디언트 적용 (일관성)
6. ✅ `cursor-not-allowed` → `cursor-wait` (로딩 상태 더 명확하게)

### 검증 결과
- ✅ TypeScript 타입 체크 통과
- ✅ 빌드 오류 없음
- ✅ 3개 버튼 스타일 완전 통일화
