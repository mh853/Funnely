# Sticky 미리보기 내부 스크롤 개선

## 문제 진단

### 현재 상태
- Sticky 고정: ✅ 작동
- 내부 스크롤: ❓ 제대로 작동하지 않을 가능성

### 원인 분석
```tsx
{/* Mobile Phone Preview Frame - Flex Item */}
<div className="flex-1 overflow-hidden flex flex-col">
  <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl mx-auto max-w-full flex-1 flex flex-col">
    <div className="bg-white rounded-2xl overflow-hidden flex-1 flex flex-col">
      {/* Phone Status Bar */}
      <div className="bg-gray-50 px-4 py-2 ... flex-shrink-0">...</div>

      {/* Preview Content - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-white relative">
        {/* Content */}
      </div>
    </div>
  </div>
</div>
```

**문제점**:
1. `max-w-full`이 너비만 제한하고 높이는 제한하지 않음
2. `flex-1`이 중첩되어 높이 계산이 모호할 수 있음
3. Phone frame의 padding/margin이 스크롤 영역을 침범

## 해결 방안

### Option 1: 명시적 높이 설정 (권장)
Preview content에 명시적 최대 높이 설정

```tsx
{/* Preview Content - Scrollable */}
<div className="flex-1 overflow-y-auto bg-white relative min-h-0">
  {/* min-h-0이 flex-1과 함께 사용되면 스크롤 활성화 */}
</div>
```

**장점**:
- ✅ 간단한 CSS 속성 추가만으로 해결
- ✅ Flex 레이아웃 유지
- ✅ 기존 구조 최소 변경

**단점**:
- ❌ `min-h-0`이 필요한 이유가 직관적이지 않음

### Option 2: Phone Frame 크기 고정
Phone frame에 고정 높이 설정

```tsx
<div className="bg-gray-900 rounded-3xl p-3 shadow-2xl mx-auto w-[375px] h-[667px] flex flex-col">
  {/* 375x667 = iPhone SE 크기 */}
</div>
```

**장점**:
- ✅ 정확한 모바일 화면 시뮬레이션
- ✅ 스크롤 동작 보장

**단점**:
- ❌ 화면 크기에 따라 미리보기가 작아질 수 있음
- ❌ Resizable sidebar와 호환성 문제

### Option 3: 혼합 방식 (최적)
Flex 레이아웃 + min-h-0 + 적절한 크기 제한

```tsx
{/* Mobile Phone Preview Frame */}
<div className="flex-1 flex items-center justify-center overflow-hidden">
  <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl w-full max-w-[400px] h-full max-h-[700px] flex flex-col">
    <div className="bg-white rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
      {/* Phone Status Bar */}
      <div className="bg-gray-50 px-4 py-2 ... flex-shrink-0">...</div>

      {/* Preview Content - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-white relative min-h-0">
        {/* Content */}
      </div>
    </div>
  </div>
</div>
```

**장점**:
- ✅ 반응형 크기 조절
- ✅ 스크롤 동작 보장
- ✅ 화면 중앙 정렬
- ✅ Resizable sidebar 호환

## 선택된 접근: Option 3 (혼합 방식)

### 구현 상세

#### 1. Phone Frame Wrapper 추가
```tsx
{/* Mobile Phone Preview Frame - Flex Item */}
<div className="flex-1 flex items-center justify-center overflow-hidden">
```
- `flex items-center justify-center`: Phone frame 중앙 정렬
- `overflow-hidden`: 넘치는 내용 숨김

#### 2. Phone Frame 크기 제한
```tsx
<div className="bg-gray-900 rounded-3xl p-3 shadow-2xl w-full max-w-[400px] h-full max-h-[700px] flex flex-col">
```
- `w-full max-w-[400px]`: 너비 최대 400px
- `h-full max-h-[700px]`: 높이 최대 700px

#### 3. min-h-0 추가
```tsx
<div className="bg-white rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
  ...
  <div className="flex-1 overflow-y-auto bg-white relative min-h-0">
```
- `min-h-0`: Flex item의 최소 높이를 0으로 설정하여 스크롤 활성화

### CSS `min-h-0` 설명

**왜 필요한가?**

Flex items는 기본적으로 `min-height: auto`를 가집니다. 이는 내용물의 크기만큼 최소 높이가 설정된다는 의미입니다.

```
flex-1 → flex: 1 1 0%
       → flex-grow: 1, flex-shrink: 1, flex-basis: 0%
       → BUT min-height: auto (기본값)
```

내용물이 컨테이너보다 크면:
- `min-height: auto` → 컨테이너가 내용물 크기로 확장
- 스크롤이 작동하지 않음

해결:
- `min-h-0` → `min-height: 0`
- 내용물 크기와 무관하게 flex 계산에 따라 크기 결정
- `overflow-y-auto`가 정상 작동

## 변경사항 요약

### Before
```tsx
<div className="flex-1 overflow-hidden flex flex-col">
  <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl mx-auto max-w-full flex-1 flex flex-col">
    <div className="bg-white rounded-2xl overflow-hidden flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto bg-white relative">
```

### After
```tsx
<div className="flex-1 flex items-center justify-center overflow-hidden">
  <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl w-full max-w-[400px] h-full max-h-[700px] flex flex-col">
    <div className="bg-white rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto bg-white relative min-h-0">
```

### 주요 변경점
| 항목 | Before | After | 이유 |
|------|--------|-------|------|
| Wrapper layout | `flex-col` | `items-center justify-center` | Phone frame 중앙 정렬 |
| Phone width | `max-w-full` | `w-full max-w-[400px]` | 명확한 너비 제한 |
| Phone height | `flex-1` | `h-full max-h-[700px]` | 명확한 높이 제한 |
| Inner wrapper | `flex-1 flex-col` | `flex-1 flex-col min-h-0` | 스크롤 활성화 |
| Scroll container | `overflow-y-auto` | `overflow-y-auto min-h-0` | 스크롤 보장 |

## 테스트 시나리오

### 스크롤 동작 테스트
1. **짧은 콘텐츠**: 스크롤바 없음, 정상 표시
2. **긴 콘텐츠**: 스크롤바 표시, 스크롤 가능
3. **섹션 추가/제거**: 동적으로 스크롤 활성화/비활성화

### 크기 조절 테스트
1. **큰 화면**: Phone frame 최대 400px 너비, 700px 높이
2. **작은 sidebar**: Phone frame 비율 유지하며 축소
3. **Resize**: Sidebar 너비 조절 시 Phone frame 반응형 조절

## 추가 개선사항

### Phone Frame 비율 유지
현재는 `max-w-[400px]`와 `max-h-[700px]`로 고정되어 있지만, 필요시 aspect ratio를 유지할 수 있습니다:

```tsx
<div className="... aspect-[9/16] max-w-[400px]">
```

### 커스텀 스크롤바 스타일
더 나은 UX를 위해 스크롤바 스타일 커스터마이징:

```tsx
<div className="... overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
```

Tailwind 설정 필요:
```js
// tailwind.config.js
plugins: [
  require('tailwind-scrollbar'),
]
```
