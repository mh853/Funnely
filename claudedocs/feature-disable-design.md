# 기본 플랜 기능 비활성화 UI 설계

**날짜**: 2025-12-26
**목적**: 19,000원 기본 플랜 사용자에게 프리미엄 기능을 보이되 비활성화 처리
**타입**: UI/UX 개선 - 업그레이드 유도 설계

---

## 🎯 요구사항

### 현재 상태 (AS-IS)
```typescript
// planFeatures를 통한 필터링 (완전히 숨김)
const filteredNavigation = navigation.filter(item => {
  if (!item.requiredFeature) return true
  return planFeatures[item.requiredFeature] === true  // false면 아예 안보임
})
```

**문제점**:
- 기본 플랜 사용자는 "트래픽 분석", "DB 리포트", "DB 스케줄", "예약 스케줄" 메뉴를 아예 볼 수 없음
- 업그레이드 유도 기회 상실
- 어떤 기능이 있는지 모르고 사용

### 목표 상태 (TO-BE)
```typescript
// 모든 메뉴를 보여주되, 권한 없으면 비활성화
const allNavigation = navigation.map(item => ({
  ...item,
  disabled: item.requiredFeature && !planFeatures[item.requiredFeature]
}))
```

**개선점**:
- ✅ 모든 기능을 사이드바에 표시
- ✅ 권한 없는 메뉴는 비활성화 + 툴팁 표시
- ✅ 클릭 시 업그레이드 안내 모달
- ✅ 프리미엄 기능 인지도 향상

---

## 🎨 UI/UX 설계

### 1. 비활성화 상태 시각적 표현

#### 일반 메뉴 (활성화)
```tsx
<Link href="/dashboard/leads">
  <PhoneIcon className="text-blue-600" />
  <span className="text-gray-900">DB 현황</span>
</Link>
```

#### 비활성화 메뉴 (권한 없음)
```tsx
<button
  disabled
  className="cursor-not-allowed opacity-50"
  onClick={handleUpgradePrompt}
>
  <PresentationChartLineIcon className="text-gray-300" />
  <span className="text-gray-400">트래픽 분석</span>
  <LockClosedIcon className="text-gray-400 h-4 w-4" /> {/* 자물쇠 아이콘 */}
</button>
```

### 2. 색상 시스템

| 상태 | 배경 | 텍스트 | 아이콘 | 호버 효과 |
|------|------|--------|--------|-----------|
| 활성 (사용 가능) | `bg-blue-50` | `text-blue-600` | `text-blue-600` | `hover:bg-gray-50` |
| 일반 (사용 가능) | `bg-white` | `text-gray-700` | `text-gray-400` | `hover:bg-gray-50` |
| **비활성 (권한 없음)** | `bg-gray-50` | `text-gray-400` | `text-gray-300` | `cursor-not-allowed` |

### 3. 인터랙션 설계

#### 시나리오 1: 비활성화 메뉴 클릭
```
사용자: "트래픽 분석" 클릭
→ 페이지 이동 차단 (preventDefault)
→ 업그레이드 안내 모달 표시
```

#### 시나리오 2: 툴팁 호버
```
사용자: 비활성화 메뉴에 마우스 오버
→ 툴팁 표시: "프로 플랜 이상 필요 (클릭하면 업그레이드)"
```

#### 시나리오 3: 업그레이드 모달
```tsx
<UpgradeModal>
  <Title>트래픽 분석 기능 잠김</Title>
  <Description>
    이 기능은 프로 플랜 이상에서 사용 가능합니다.
    더 강력한 분석 도구로 비즈니스를 성장시키세요.
  </Description>
  <Features>
    ✅ 실시간 트래픽 분석
    ✅ 전환율 추적
    ✅ 고급 리포트
  </Features>
  <Button href="/dashboard/settings?tab=subscription">
    플랜 업그레이드
  </Button>
</UpgradeModal>
```

---

## 📋 구현 사양

### 1. 타입 정의

```typescript
// navigation 아이템 타입 확장
interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiredFeature?: string
  disabled?: boolean  // 비활성화 상태
  disabledReason?: string  // 비활성화 이유 (툴팁용)
}
```

### 2. 플랜별 기능 매핑

```typescript
// 기본 플랜 (19,000원)
const BASIC_PLAN_FEATURES = {
  dashboard: true,           // ✅ 대시보드
  db_status: true,           // ✅ DB 현황
  db_schedule: false,        // ❌ DB 스케줄 (비활성화)
  reservation_schedule: false, // ❌ 예약 스케줄 (비활성화)
  analytics: false,          // ❌ 트래픽 분석 (비활성화)
  reports: false,            // ❌ DB 리포트 (비활성화)
}

// 프로 플랜 이상
const PRO_PLAN_FEATURES = {
  dashboard: true,
  db_status: true,
  db_schedule: true,         // ✅ DB 스케줄
  reservation_schedule: true, // ✅ 예약 스케줄
  analytics: true,           // ✅ 트래픽 분석
  reports: true,             // ✅ DB 리포트
}
```

### 3. 비활성화 메뉴 처리 로직

```typescript
// Sidebar.tsx 수정
const processedNavigation = navigation.map(item => {
  const hasFeature = !item.requiredFeature || planFeatures[item.requiredFeature]

  return {
    ...item,
    disabled: !hasFeature,
    disabledReason: !hasFeature
      ? `프로 플랜 이상 필요 (클릭하면 업그레이드)`
      : undefined
  }
})
```

### 4. 메뉴 렌더링 컴포넌트

```tsx
// MenuItem 컴포넌트
function MenuItem({ item, isActive, onUpgradeClick }: MenuItemProps) {
  const baseClasses = "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"

  if (item.disabled) {
    return (
      <div className="relative group/disabled">
        <button
          onClick={(e) => {
            e.preventDefault()
            onUpgradeClick(item.name)
          }}
          disabled
          className={`
            ${baseClasses}
            bg-gray-50 text-gray-400 cursor-not-allowed opacity-60
            hover:opacity-80 transition-opacity
          `}
          title={item.disabledReason}
        >
          <item.icon className="h-6 w-6 shrink-0 text-gray-300" />
          <span className="flex-1">{item.name}</span>
          <LockClosedIcon className="h-4 w-4 text-gray-400" />
        </button>

        {/* 툴팁 */}
        <div className="
          absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs
          rounded-lg opacity-0 invisible group-hover/disabled:opacity-100
          group-hover/disabled:visible transition-all whitespace-nowrap z-50
        ">
          {item.disabledReason}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </div>
      </div>
    )
  }

  // 활성화된 메뉴 (기존 로직)
  return (
    <Link href={item.href} className={`${baseClasses} ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}>
      <item.icon className={`h-6 w-6 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
      {item.name}
    </Link>
  )
}
```

### 5. 업그레이드 모달 컴포넌트

```tsx
// UpgradePromptModal.tsx (신규 생성)
interface UpgradePromptModalProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
}

export function UpgradePromptModal({ isOpen, onClose, featureName }: UpgradePromptModalProps) {
  const featureDescriptions = {
    '트래픽 분석': {
      title: '트래픽 분석으로 고객 행동 이해하기',
      description: '실시간 트래픽 분석으로 마케팅 ROI를 극대화하세요.',
      features: [
        '실시간 방문자 추적',
        '전환율 분석',
        '유입 경로 분석',
        'UTM 파라미터 추적'
      ]
    },
    'DB 리포트': {
      title: 'DB 리포트로 데이터 인사이트 확보',
      description: '자동 생성 리포트로 의사결정 속도를 높이세요.',
      features: [
        '자동 리포트 생성',
        'Excel/PDF 내보내기',
        '커스텀 리포트 템플릿',
        '일정 기반 자동 발송'
      ]
    },
    'DB 스케줄': {
      title: 'DB 스케줄로 효율적인 관리',
      description: 'DB 관리를 스케줄로 자동화하세요.',
      features: [
        '자동 DB 정리',
        '정기 백업',
        '알림 설정',
        '우선순위 관리'
      ]
    },
    '예약 스케줄': {
      title: '예약 스케줄로 고객 관리 자동화',
      description: '예약 관리를 쉽고 빠르게 처리하세요.',
      features: [
        '온라인 예약 시스템',
        '자동 알림 발송',
        '캘린더 통합',
        '예약 분석'
      ]
    }
  }

  const feature = featureDescriptions[featureName]

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black/30 z-50" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <DialogPanel className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6">
          {/* 자물쇠 아이콘 */}
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="h-6 w-6 text-blue-600" />
          </div>

          {/* 타이틀 */}
          <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
            {feature.title}
          </h3>

          {/* 설명 */}
          <p className="text-sm text-gray-600 text-center mb-6">
            {feature.description}
          </p>

          {/* 기능 리스트 */}
          <ul className="space-y-2 mb-6">
            {feature.features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" />
                {feat}
              </li>
            ))}
          </ul>

          {/* CTA 버튼 */}
          <div className="space-y-2">
            <Link
              href="/dashboard/settings?tab=subscription"
              className="block w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
              onClick={onClose}
            >
              프로 플랜으로 업그레이드
            </Link>
            <button
              onClick={onClose}
              className="block w-full px-4 py-2 text-gray-600 text-center text-sm hover:text-gray-900"
            >
              나중에 하기
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
```

---

## 🔄 변경 흐름

### Phase 1: Sidebar 컴포넌트 수정
1. **필터링 로직 제거** (Line 58-61)
   - `filter()` → `map()` 으로 변경
   - 비활성화 상태 추가

2. **MenuItem 렌더링 분기** (Line 145-172)
   - `disabled` 상태 확인
   - 비활성화 시 `button` 렌더링 (Link 대신)
   - 활성화 시 기존 `Link` 렌더링

3. **업그레이드 모달 상태 추가**
   ```typescript
   const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
   const [selectedFeature, setSelectedFeature] = useState('')
   ```

### Phase 2: UpgradePromptModal 생성
1. **컴포넌트 파일 생성**
   - `src/components/modals/UpgradePromptModal.tsx`

2. **기능별 설명 데이터 정의**
   - 트래픽 분석, DB 리포트, DB 스케줄, 예약 스케줄

3. **모달 UI 구현**
   - HeadlessUI Dialog 사용
   - 반응형 디자인 적용

### Phase 3: 아이콘 추가
1. **LockClosedIcon 임포트**
   ```typescript
   import { LockClosedIcon } from '@heroicons/react/24/solid'
   ```

2. **비활성화 메뉴에 표시**
   - 메뉴 아이템 우측에 작은 자물쇠 아이콘

---

## 📊 기대 효과

### 비즈니스 관점
1. **업그레이드 전환율 향상**
   - 기능 인지도 증가 → 니즈 확인 → 업그레이드 결정
   - 추정: 전환율 20-30% 증가 (기존 0% → 20-30%)

2. **사용자 불만 감소**
   - "왜 안보여?" → "보이는데 잠겨있네" (이해 향상)
   - 명확한 플랜 차이 인지

3. **마케팅 효과**
   - 프리미엄 기능 지속 노출
   - 클릭마다 업그레이드 모달 (자연스러운 광고)

### UX 관점
1. **투명성 향상**
   - 모든 기능 노출 (숨김 없음)
   - 명확한 비활성화 이유

2. **프리미엄 가치 전달**
   - 업그레이드 시 얻을 혜택 명확화
   - 기능별 차별화 포인트 강조

3. **사용자 교육**
   - 툴팁으로 기능 설명
   - 모달로 상세 정보 제공

---

## 🧪 테스트 시나리오

### TC-001: 기본 플랜 사용자 메뉴 확인
```
Given: 19,000원 기본 플랜 사용자 로그인
When: 사이드바 확인
Then:
  - ✅ "대시보드" 활성화
  - ✅ "DB 현황" 활성화
  - ❌ "DB 스케줄" 비활성화 (회색 + 자물쇠)
  - ❌ "예약 스케줄" 비활성화 (회색 + 자물쇠)
  - ❌ "트래픽 분석" 비활성화 (회색 + 자물쇠)
  - ❌ "DB 리포트" 비활성화 (회색 + 자물쇠)
```

### TC-002: 비활성화 메뉴 호버
```
Given: 비활성화된 "트래픽 분석" 메뉴
When: 마우스 오버
Then: 툴팁 표시 "프로 플랜 이상 필요 (클릭하면 업그레이드)"
```

### TC-003: 비활성화 메뉴 클릭
```
Given: 비활성화된 "트래픽 분석" 메뉴
When: 클릭
Then:
  - ✅ 페이지 이동 차단
  - ✅ 업그레이드 모달 표시
  - ✅ 모달 내용: 트래픽 분석 설명 + 4가지 기능
  - ✅ "프로 플랜으로 업그레이드" 버튼
```

### TC-004: 업그레이드 버튼 클릭
```
Given: 업그레이드 모달 열림
When: "프로 플랜으로 업그레이드" 버튼 클릭
Then:
  - ✅ 모달 닫힘
  - ✅ 설정 페이지로 이동 (/dashboard/settings?tab=subscription)
  - ✅ 구독 탭 자동 선택
```

### TC-005: 프로 플랜 사용자
```
Given: 프로 플랜 사용자 로그인
When: 사이드바 확인
Then:
  - ✅ 모든 메뉴 활성화 (자물쇠 없음)
  - ✅ 모든 메뉴 클릭 가능
```

---

## 📁 수정 파일 목록

### 1. 기존 파일 수정
- **src/components/dashboard/Sidebar.tsx**
  - Line 58-61: 필터링 → 비활성화 처리
  - Line 145-172: MenuItem 렌더링 로직 분기
  - 업그레이드 모달 상태 추가

### 2. 신규 파일 생성
- **src/components/modals/UpgradePromptModal.tsx**
  - 업그레이드 안내 모달 컴포넌트

### 3. 타입 정의 추가
- **src/types/navigation.ts** (옵션)
  - NavigationItem 인터페이스 정의

---

## 🎨 디자인 토큰

### 색상
```typescript
const colors = {
  active: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    icon: 'text-blue-600'
  },
  inactive: {
    bg: 'bg-white',
    text: 'text-gray-700',
    icon: 'text-gray-400'
  },
  disabled: {
    bg: 'bg-gray-50',
    text: 'text-gray-400',
    icon: 'text-gray-300',
    lock: 'text-gray-400'
  }
}
```

### 스페이싱
```typescript
const spacing = {
  menuGap: 'space-y-1',
  iconTextGap: 'gap-x-3',
  padding: 'p-2',
  lockIconSize: 'h-4 w-4'
}
```

### 애니메이션
```typescript
const transitions = {
  disabled: 'opacity-60 hover:opacity-80 transition-opacity',
  tooltip: 'opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all',
  modal: 'transition-all duration-200 ease-in-out'
}
```

---

**설계일**: 2025-12-26
**우선순위**: High (사용자 경험 + 매출 증대)
**예상 작업 시간**: 3-4시간
**영향 범위**: 사이드바 UI + 신규 모달 컴포넌트
