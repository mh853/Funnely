# Analytics 페이지 - DB 전환수 테이블 설명 문구 추가 설계

## 📋 요구사항

**목표**: DB 전환수 (전환율) 테이블 헤더에 설명 문구 추가
- 위치: `dashboard/analytics` 페이지의 "DB 전환수 (전환율)" 테이블 헤더
- 문구: "트래픽 유입 대비 DB 전환된 비율"
- 스타일: 상대적으로 작고 흐린 텍스트 (부제목/설명)

## 🎯 설계 원칙

### 1. **일관성 (Consistency)**
- 트래픽 유입 테이블과 동일한 헤더 구조 유지
- 기존 디자인 시스템과 조화로운 스타일 적용

### 2. **가독성 (Readability)**
- 주 타이틀과 설명 문구의 명확한 시각적 계층
- 작지만 읽기 쉬운 폰트 크기 사용

### 3. **정보 전달 (Clarity)**
- 전환율의 의미를 간결하게 설명
- 사용자가 데이터를 이해하는 데 도움

## 🏗️ 현재 구조 분석

### 기존 코드 ([AnalyticsClient.tsx:296-300](src/app/dashboard/analytics/AnalyticsClient.tsx#L296-L300))

```tsx
<div className="p-4 border-b border-gray-100 bg-yellow-50">
  <h2 className="text-base font-bold text-gray-900">
    DB 전환수 (전환율)
  </h2>
</div>
```

### 트래픽 유입 테이블 비교 ([AnalyticsClient.tsx:191-195](src/app/dashboard/analytics/AnalyticsClient.tsx#L191-L195))

```tsx
<div className="p-4 border-b border-gray-100 bg-yellow-50">
  <h2 className="text-base font-bold text-gray-900">
    트래픽 유입 (페이지뷰)
  </h2>
</div>
```

### 관찰
- 두 테이블 모두 동일한 헤더 구조 사용
- `bg-yellow-50` 배경색 공통 사용
- 타이틀만 있고 설명 문구 없음

## 📐 설계 옵션

### Option 1: 단일 줄 구조 (권장)
타이틀과 설명을 같은 줄에 배치, 설명은 작고 흐리게

```tsx
<div className="p-4 border-b border-gray-100 bg-yellow-50">
  <h2 className="text-base font-bold text-gray-900">
    DB 전환수 (전환율)
    <span className="ml-2 text-xs font-normal text-gray-500">
      트래픽 유입 대비 DB 전환된 비율
    </span>
  </h2>
</div>
```

**장점**:
- 컴팩트하고 깔끔
- 헤더 높이 변화 없음
- 타이틀과 설명의 관계가 명확

**단점**:
- 긴 텍스트일 경우 모바일에서 줄바꿈 가능

### Option 2: 두 줄 구조
타이틀과 설명을 별도 줄로 분리

```tsx
<div className="p-4 border-b border-gray-100 bg-yellow-50">
  <h2 className="text-base font-bold text-gray-900">
    DB 전환수 (전환율)
  </h2>
  <p className="text-xs text-gray-500 mt-1">
    트래픽 유입 대비 DB 전환된 비율
  </p>
</div>
```

**장점**:
- 더 명확한 시각적 계층
- 긴 설명 텍스트에 적합
- 모바일 반응형 우수

**단점**:
- 헤더 높이 증가
- 트래픽 유입 테이블과 높이 불일치

### Option 3: 툴팁/아이콘 방식
정보 아이콘을 추가하여 호버 시 설명 표시

```tsx
<div className="p-4 border-b border-gray-100 bg-yellow-50">
  <div className="flex items-center gap-2">
    <h2 className="text-base font-bold text-gray-900">
      DB 전환수 (전환율)
    </h2>
    <div className="group relative">
      <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
      <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg -top-1 left-6">
        트래픽 유입 대비 DB 전환된 비율
      </div>
    </div>
  </div>
</div>
```

**장점**:
- 헤더 높이 유지
- 추가 정보는 필요 시에만 표시
- 세련된 UX

**단점**:
- 사용자가 호버해야 정보 확인 가능
- 모바일에서 동작 제한적
- 추가 아이콘 import 필요

## ✅ 권장 설계: Option 1 (단일 줄 구조)

### 이유
1. **간결성**: 추가 공간 차지 없이 정보 전달
2. **일관성**: 기존 헤더 구조와 잘 어울림
3. **모바일 대응**: 짧은 설명 문구로 줄바꿈 최소화
4. **구현 용이성**: 최소한의 코드 변경

### 변경 코드

**파일**: [src/app/dashboard/analytics/AnalyticsClient.tsx:296-300](src/app/dashboard/analytics/AnalyticsClient.tsx#L296-L300)

**변경 전**:
```tsx
<div className="p-4 border-b border-gray-100 bg-yellow-50">
  <h2 className="text-base font-bold text-gray-900">
    DB 전환수 (전환율)
  </h2>
</div>
```

**변경 후**:
```tsx
<div className="p-4 border-b border-gray-100 bg-yellow-50">
  <h2 className="text-base font-bold text-gray-900">
    DB 전환수 (전환율)
    <span className="ml-2 text-xs font-normal text-gray-500">
      트래픽 유입 대비 DB 전환된 비율
    </span>
  </h2>
</div>
```

### 스타일 세부사항

| 속성 | 값 | 목적 |
|------|-----|------|
| `ml-2` | margin-left: 0.5rem | 타이틀과 설명 사이 간격 |
| `text-xs` | font-size: 0.75rem (12px) | 작은 폰트 크기 |
| `font-normal` | font-weight: 400 | 볼드 제거 (상속 방지) |
| `text-gray-500` | color: #6B7280 | 흐린 회색 텍스트 |

### 시각적 비교

**변경 전**:
```
┌────────────────────────────────────────┐
│ DB 전환수 (전환율)                      │
└────────────────────────────────────────┘
```

**변경 후**:
```
┌─────────────────────────────────────────────────────────────┐
│ DB 전환수 (전환율) 트래픽 유입 대비 DB 전환된 비율          │
│ ^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        │
│ 볼드, 큰 텍스트    작고 흐린 텍스트                          │
└─────────────────────────────────────────────────────────────┘
```

## 📱 반응형 디자인 고려사항

### 데스크톱 (lg 이상)
```tsx
DB 전환수 (전환율) 트래픽 유입 대비 DB 전환된 비율
└─ 한 줄로 표시, 충분한 공간
```

### 태블릿 (md ~ lg)
```tsx
DB 전환수 (전환율) 트래픽 유입 대비
DB 전환된 비율
└─ 자동 줄바꿈, 여전히 읽기 쉬움
```

### 모바일 (sm 이하)
```tsx
DB 전환수 (전환율)
트래픽 유입 대비 DB 전환된 비율
└─ 줄바꿈, 여전히 명확
```

**개선 옵션** (필요 시):
```tsx
<h2 className="text-base font-bold text-gray-900">
  DB 전환수 (전환율)
  <span className="ml-2 text-xs font-normal text-gray-500 hidden sm:inline">
    트래픽 유입 대비 DB 전환된 비율
  </span>
</h2>
<p className="text-xs text-gray-500 mt-1 sm:hidden">
  트래픽 유입 대비 DB 전환된 비율
</p>
```
→ 모바일에서는 두 줄, 데스크톱에서는 한 줄

## 🎨 디자인 토큰

### Tailwind CSS 클래스 분석

```css
/* 주 타이틀 */
.text-base      → font-size: 1rem (16px)
.font-bold      → font-weight: 700
.text-gray-900  → color: #111827 (거의 검정)

/* 설명 문구 */
.ml-2           → margin-left: 0.5rem (8px)
.text-xs        → font-size: 0.75rem (12px)
.font-normal    → font-weight: 400 (기본)
.text-gray-500  → color: #6B7280 (중간 회색)
```

### 타이포그래피 계층

```
Level 1: 타이틀 - 16px, Bold, 거의 검정
Level 2: 설명 - 12px, Normal, 중간 회색
└─ 명확한 시각적 계층 형성
```

## 🧪 테스트 시나리오

### Test 1: 시각적 확인
```
1. /dashboard/analytics 페이지 접속
2. "DB 전환수 (전환율)" 테이블 헤더 확인
3. 설명 문구가 작고 흐리게 표시되는지 확인
4. 타이틀과 설명의 시각적 구분이 명확한지 확인
```

### Test 2: 반응형 테스트
```
1. 데스크톱 (1920px): 한 줄 표시 확인
2. 태블릿 (768px): 줄바꿈 시 여전히 읽기 쉬운지 확인
3. 모바일 (375px): 텍스트 오버플로우 없는지 확인
```

### Test 3: 접근성 테스트
```
1. 스크린 리더로 헤더 읽기
2. 색상 대비 확인 (WCAG AA 기준)
   - 타이틀: #111827 on #FEF3C7 (yellow-50)
   - 설명: #6B7280 on #FEF3C7
```

## 📊 예상 결과

### Before (현재)
```tsx
┌───────────────────────────────────┐
│ DB 전환수 (전환율)                 │ ← 타이틀만
└───────────────────────────────────┘
```

### After (변경 후)
```tsx
┌─────────────────────────────────────────────────────────┐
│ DB 전환수 (전환율) 트래픽 유입 대비 DB 전환된 비율      │
│ ^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        │
│ 크고 진하게        작고 흐리게                           │
└─────────────────────────────────────────────────────────┘
```

## 🔄 확장 가능성

### 트래픽 유입 테이블에도 동일 패턴 적용

만약 트래픽 유입 테이블에도 설명이 필요하다면:

```tsx
<div className="p-4 border-b border-gray-100 bg-yellow-50">
  <h2 className="text-base font-bold text-gray-900">
    트래픽 유입 (페이지뷰)
    <span className="ml-2 text-xs font-normal text-gray-500">
      랜딩페이지에 방문한 총 페이지뷰 수
    </span>
  </h2>
</div>
```

### 다른 테이블 헤더에도 적용

- "랜딩페이지 분석" 테이블
- "UTM 분석" 섹션
- 기타 analytics 관련 테이블

## 📝 구현 체크리스트

- [ ] AnalyticsClient.tsx 파일 수정
- [ ] 설명 문구 추가 (DB 전환수 테이블)
- [ ] 스타일 적용 확인 (작고 흐린 텍스트)
- [ ] 데스크톱 반응형 테스트
- [ ] 태블릿 반응형 테스트
- [ ] 모바일 반응형 테스트
- [ ] 접근성 검증 (색상 대비)
- [ ] Git commit & push

## 🎯 성공 기준

1. **시각적 계층**: 타이틀과 설명의 명확한 구분
2. **가독성**: 설명 문구가 방해되지 않으면서도 읽기 쉬움
3. **일관성**: 전체 디자인 시스템과 조화
4. **반응형**: 모든 화면 크기에서 적절하게 표시
5. **접근성**: WCAG AA 기준 충족

---

**작성일**: 2025-02-24
**작성자**: Claude Code
**버전**: 1.0
