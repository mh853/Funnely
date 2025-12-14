# 랜딩페이지 수정 페이지 - Sticky 미리보기 디자인 명세

## 📋 현재 상태 분석

### 현재 구조
- **파일**: `src/components/landing-pages/LandingPageNewForm.tsx`
- **레이아웃**: 좌측 편집 폼 + 우측 미리보기 사이드바 (2-column layout)
- **미리보기 위치**: Line 2334-2476
- **문제점**: 스크롤 시 미리보기가 화면에서 사라짐 (static positioning)

### 레이아웃 코드 구조
```tsx
// Line 2295: Main Container
<div className="flex gap-6 relative min-h-screen">

  {/* Line 2296-2331: Left Column - 편집 폼 */}
  <div className="flex-1 space-y-6 pb-20">
    {/* 모든 설정 항목들 */}
  </div>

  {/* Line 2334-2476: Right Column - 미리보기 사이드바 */}
  <div className="hidden lg:flex flex-shrink-0 relative" style={{ width: sidebarWidth }}>
    {/* Resizable handle */}
    {/* Preview content */}
  </div>
</div>
```

## 🎯 디자인 목표

### 요구사항
1. **Sticky Positioning**: 우측 미리보기가 스크롤 시에도 화면에 고정
2. **반응형 유지**: 기존 resizable 기능 보존 (400px 기본 너비)
3. **UX 최적화**:
   - 상단 헤더와의 간격 유지
   - 하단 여백 확보
   - 편집 폼과 동일한 스크롤 경험

### 기술 제약사항
- Tailwind CSS 사용
- Next.js App Router 환경
- 기존 resizable 기능 보존 필요
- 모바일(< lg) 화면에서는 미리보기 숨김 (기존 동작 유지)

## 🏗️ 아키텍처 설계

### 1. Sticky Container Strategy

#### Option A: `position: sticky` (권장)
**장점**:
- CSS 네이티브 기능, 성능 최적
- 스크롤 범위 자동 계산
- 하드웨어 가속 지원

**단점**:
- 부모 container의 height 제약 필요
- overflow 설정에 민감

**구현**:
```tsx
<div className="sticky top-6 self-start">
  {/* Preview content */}
</div>
```

#### Option B: `position: fixed` + offset calculation
**장점**:
- 정확한 위치 제어
- 복잡한 레이아웃에서도 동작

**단점**:
- JavaScript 계산 필요
- 리사이징 시 재계산 overhead
- width 수동 관리 필요

### 2. 선택된 접근 방식: **Option A (Sticky)**

#### 이유
1. ✅ 간단한 CSS만으로 구현 가능
2. ✅ 기존 resizable 기능과 호환
3. ✅ 성능 우수
4. ✅ 유지보수 용이

## 📐 구현 명세

### Component Structure

```tsx
{/* Main Container - 높이 제약 제거 */}
<div className="flex gap-6 relative">

  {/* Left Column - 편집 폼 */}
  <div className="flex-1 space-y-6 pb-20">
    {/* Content */}
  </div>

  {/* Right Column - Sticky Preview Sidebar */}
  <div
    className="hidden lg:flex flex-shrink-0"
    style={{ width: sidebarWidth }}
  >
    {/* Resizable Handle - absolute positioning 유지 */}
    <div
      className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 bg-indigo-300 transition-colors z-20"
      onMouseDown={handleMouseDown}
    />

    {/* Sticky Container - NEW */}
    <div className="sticky top-6 self-start w-full">
      <div className="h-[calc(100vh-3rem)] flex flex-col">
        {/* Preview Header */}
        <div className="flex items-center justify-between mb-4">
          {/* Header content */}
        </div>

        {/* Preview Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Phone frame and preview */}
        </div>

        {/* Help Text - Fixed at bottom */}
        <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl flex-shrink-0">
          {/* Help content */}
        </div>
      </div>
    </div>
  </div>
</div>
```

### CSS Classes 변경사항

#### 변경 전 (Line 2334-2339)
```tsx
<div
  className="hidden lg:flex flex-shrink-0 relative"
  style={{ width: sidebarWidth }}
>
```

#### 변경 후
```tsx
<div
  className="hidden lg:flex flex-shrink-0"
  style={{ width: sidebarWidth }}
>
  {/* Resizable handle */}
  <div className="absolute left-0 top-0 bottom-0 w-1 ..." />

  {/* NEW: Sticky wrapper */}
  <div className="sticky top-6 self-start w-full">
    {/* Preview content wrapper with max-height */}
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* Content */}
    </div>
  </div>
</div>
```

### 주요 CSS 속성 설명

| 속성 | 값 | 목적 |
|------|-----|------|
| `sticky` | `top-6` | 상단에서 24px 떨어진 위치에 고정 |
| `self-start` | - | flex item이 상단에 정렬되도록 설정 |
| `h-[calc(100vh-3rem)]` | - | 뷰포트 높이 - 48px (상하 여백) |
| `flex flex-col` | - | 내부 요소 vertical layout |
| `flex-1` | - | Preview content가 가용 공간 차지 |
| `overflow-y-auto` | - | Preview content만 스크롤 가능 |
| `flex-shrink-0` | - | Help text가 항상 보이도록 고정 |

## 🔄 동작 흐름

### 스크롤 시나리오

1. **페이지 로드**
   - 미리보기가 우측 상단에 표시
   - `top-6` 위치에 배치

2. **사용자가 아래로 스크롤**
   - 좌측 편집 폼: 정상적으로 스크롤
   - 우측 미리보기: `sticky` 상태로 화면 고정 유지
   - 미리보기 내부 콘텐츠: 독립적으로 스크롤 가능

3. **미리보기 내부 스크롤**
   - Phone preview frame 내부만 스크롤
   - Header와 Help text는 고정 유지

### Resizable 기능 유지

```tsx
// Line 204-205: 기존 state 유지
const [sidebarWidth, setSidebarWidth] = useState(400)
const [isResizing, setIsResizing] = useState(false)

// Resizable handle은 absolute positioning으로 동작
// Sticky container 바깥에 위치하여 정상 작동
```

## 📱 반응형 동작

### Desktop (≥ 1024px)
- ✅ Sticky preview 활성화
- ✅ Resizable 기능 사용 가능
- ✅ 2-column layout

### Tablet/Mobile (< 1024px)
- ✅ 미리보기 숨김 (`hidden lg:flex`)
- ✅ 편집 폼만 표시
- ✅ Desktop preview modal로 확인 가능

## ⚠️ 주의사항

### Sticky Positioning 제약

1. **부모 container에 `overflow: hidden` 금지**
   - Sticky가 작동하지 않음
   - 현재 코드는 문제 없음 확인

2. **높이 계산**
   - `h-[calc(100vh-3rem)]`: 헤더 높이 고려
   - `3rem` = 48px (상단 여백 24px × 2)
   - 필요시 조정 가능

3. **Z-index 관리**
   - Resizable handle: `z-20`
   - Sticky container: 기본값 (문제 없음)
   - Modal: `z-50` (기존 유지)

### Browser 호환성

| Browser | Sticky Support | Notes |
|---------|----------------|-------|
| Chrome | ✅ Full | - |
| Safari | ✅ Full | - |
| Firefox | ✅ Full | - |
| Edge | ✅ Full | - |
| IE 11 | ❌ Not supported | Next.js default 미지원 |

## 📊 성능 고려사항

### 렌더링 성능
- ✅ CSS 네이티브 기능 사용 → GPU 가속
- ✅ JavaScript 계산 불필요
- ✅ Reflow 최소화

### 메모리
- ✅ 추가 state 없음
- ✅ Event listener 추가 없음
- ✅ 기존 구조 재사용

## 🧪 테스트 시나리오

### 기능 테스트

1. **Sticky 동작**
   - [ ] 페이지 로드 시 미리보기 표시
   - [ ] 아래로 스크롤 시 미리보기 고정
   - [ ] 위로 스크롤 시 원래 위치 복귀

2. **Resizable 기능**
   - [ ] 드래그로 너비 조절 가능
   - [ ] 최소/최대 너비 제약 작동
   - [ ] Sticky 상태에서도 정상 작동

3. **Preview 내부 스크롤**
   - [ ] Phone frame 내부만 스크롤
   - [ ] Header 고정 유지
   - [ ] Help text 하단 고정 유지

4. **반응형**
   - [ ] Desktop: sticky preview 표시
   - [ ] Tablet/Mobile: 미리보기 숨김
   - [ ] Desktop modal 정상 작동

### Edge Cases

1. **짧은 콘텐츠**
   - 편집 폼이 화면보다 짧을 때
   - → Sticky는 정상 작동 (스크롤 없음)

2. **매우 긴 미리보기**
   - Preview content가 화면보다 길 때
   - → 내부 스크롤로 해결

3. **Resize 중 스크롤**
   - Resizing 동작 중 페이지 스크롤
   - → 두 기능 독립적으로 동작

## 📝 구현 체크리스트

- [ ] Line 2334: 우측 container에서 `relative` 제거
- [ ] Line 2340+: Sticky wrapper div 추가
- [ ] Line 2340+: Height wrapper div 추가 (`h-[calc(100vh-3rem)]`)
- [ ] Line 2340+: Flex column layout 적용
- [ ] Line 2340+: Preview content에 `flex-1 overflow-y-auto` 적용
- [ ] Line 2457+: Help text에 `flex-shrink-0` 적용
- [ ] Resizable handle absolute positioning 확인
- [ ] 테스트: 기능 테스트 시나리오 전체 실행
- [ ] 테스트: Edge case 확인
- [ ] 디버그 로그 제거 (Line 54-61 edit page.tsx)

## 🔗 관련 파일

### 수정 필요
- `/src/components/landing-pages/LandingPageNewForm.tsx` (Line 2334-2476)

### 참고
- `/src/app/dashboard/landing-pages/[id]/edit/page.tsx` (디버그 로그 정리)

## 📚 참고 자료

- [MDN: position sticky](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky)
- [Tailwind CSS: Position](https://tailwindcss.com/docs/position#sticky)
- [CSS Tricks: Sticky Footer](https://css-tricks.com/couple-takes-sticky-footer/)
