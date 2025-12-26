# 기능 상세 페이지 및 기능 비교표 설계

## 📋 설계 개요

**목적**: 각 기능의 상세 정보를 제공하는 페이지와 전체 기능 비교표 페이지 설계
**디자인 컨셉**: 마케팅 홈페이지와 동일한 디자인 시스템 유지
**총 페이지 수**: 7개 (기능 상세 6개 + 기능 비교표 1개)

---

## 🎯 페이지 구조

### 1. 기능 상세 페이지 (6개)

#### URL 구조
```
/features/landing-page-builder     # 랜딩페이지 빌더
/features/database-management      # DB 관리
/features/traffic-analytics        # 트래픽 분석
/features/database-reports         # DB 리포트
/features/schedule-management      # 스케줄 관리
/features/team-collaboration       # 팀 협업
```

#### 페이지 레이아웃 구조
```
Feature Detail Page Layout:
├── Header (MarketingHeader - 재사용)
├── Hero Section
│   ├── Breadcrumb Navigation (홈 > 기능 > 기능명)
│   ├── Feature Icon (Large, Gradient)
│   ├── Feature Title
│   ├── Feature Description
│   ├── CTA Buttons (무료 체험 시작, 데모 보기)
│   └── Feature Image/Screenshot
├── Key Benefits Section
│   ├── Section Title
│   └── 3-4 Benefits (Icon + Title + Description)
├── How It Works Section
│   ├── Section Title
│   ├── Step-by-step Process (3-5 steps)
│   └── Interactive Diagram or Screenshots
├── Features Detail Section
│   ├── Section Title
│   ├── Feature Grid (세부 기능 목록)
│   └── Screenshots/GIFs
├── Use Cases Section
│   ├── Section Title
│   ├── Real-world Examples (2-3개)
│   └── Customer Testimonials (선택사항)
├── Pricing Callout Section
│   ├── "이 기능은 [베이직/프로] 플랜에 포함됩니다"
│   └── CTA to Pricing Page
├── Related Features Section
│   ├── "이 기능과 함께 사용하면 좋은 기능"
│   └── 2-3 Related Feature Cards
├── Final CTA Section (재사용)
└── Footer (MarketingFooter - 재사용)
```

---

### 2. 기능 비교표 페이지

#### URL 구조
```
/features/comparison     # 전체 기능 비교표
```

#### 페이지 레이아웃 구조
```
Feature Comparison Page Layout:
├── Header (MarketingHeader - 재사용)
├── Hero Section
│   ├── Title: "전체 기능 비교"
│   ├── Description: "베이직 플랜과 프로 플랜의 모든 기능을 한눈에 비교하세요"
│   └── Plan Selector Toggle (베이직 ⇄ 프로)
├── Feature Comparison Table
│   ├── Sticky Header (기능, 베이직, 프로)
│   ├── Feature Categories
│   │   ├── 랜딩페이지 기능
│   │   ├── DB 관리 기능
│   │   ├── 트래픽 분석 기능
│   │   ├── DB 리포트 기능
│   │   ├── 스케줄 관리 기능
│   │   └── 팀 협업 기능
│   └── Feature Rows (✓/✗/숫자/텍스트)
├── Plan Recommendation Section
│   ├── "어떤 플랜이 적합할까요?"
│   └── 2 Plan Cards with Benefits
├── FAQ Section (플랜 관련)
├── Final CTA Section (재사용)
└── Footer (MarketingFooter - 재사용)
```

---

## 🎨 디자인 시스템

### Color Palette (기존 홈페이지와 동일)
```css
Primary:
  - Blue: from-blue-600 to-indigo-600
  - Gradient backgrounds: from-blue-50 via-indigo-50 to-purple-50

Feature-specific gradients:
  - Landing Builder: from-pink-500 to-rose-500
  - DB Management: from-blue-500 to-cyan-500
  - Traffic Analytics: from-violet-500 to-purple-500
  - DB Reports: from-amber-500 to-orange-500
  - Schedule: from-green-500 to-emerald-500
  - Team: from-indigo-500 to-blue-500

Status:
  - Success: text-green-500
  - Pro Badge: from-amber-500 to-orange-500
  - Border: border-gray-200
```

### Typography
```css
Headings:
  - Page Title: text-4xl sm:text-5xl font-bold
  - Section Title: text-3xl sm:text-4xl font-bold
  - Subsection: text-2xl font-semibold
  - Card Title: text-xl font-semibold

Body:
  - Large: text-lg sm:text-xl
  - Regular: text-base
  - Small: text-sm
```

### Spacing
```css
Sections: py-24 sm:py-32
Cards: p-8
Gaps: gap-8 (grid), gap-4 (flex)
Max Width: max-w-7xl (container), max-w-2xl (content)
```

### Components
- Framer Motion animations (일관된 애니메이션)
- Rounded corners: rounded-2xl (cards), rounded-full (buttons)
- Shadows: shadow-sm, shadow-lg, shadow-xl
- Hover effects: hover:scale-105, hover:shadow-xl

---

## 📝 상세 페이지별 콘텐츠 설계

### 1. 랜딩페이지 빌더 (`/features/landing-page-builder`)

#### Hero Section
```yaml
Icon: PaintBrushIcon (from-pink-500 to-rose-500)
Title: "랜딩페이지 빌더"
Subtitle: "코딩 없이 드래그 앤 드롭으로 전문가 수준의 랜딩페이지를 만드세요"
CTA Primary: "무료로 시작하기"
CTA Secondary: "데모 보기"
```

#### Key Benefits (3개)
```yaml
Benefit_1:
  title: "직관적인 비주얼 에디터"
  description: "코딩 지식 없이도 드래그 앤 드롭으로 쉽게 제작할 수 있습니다"
  icon: CursorArrowRaysIcon

Benefit_2:
  title: "30+ 전문 템플릿"
  description: "산업별 최적화된 템플릿으로 5분 만에 랜딩페이지 완성"
  icon: RectangleStackIcon

Benefit_3:
  title: "실시간 모바일 프리뷰"
  description: "PC, 태블릿, 모바일 화면에서 실시간으로 확인하며 제작"
  icon: DevicePhoneMobileIcon
```

#### How It Works (4 steps)
```yaml
Step_1:
  title: "템플릿 선택"
  description: "산업별 최적화된 템플릿 중 선택하거나 빈 페이지에서 시작"

Step_2:
  title: "콘텐츠 편집"
  description: "텍스트, 이미지, 버튼 등을 드래그 앤 드롭으로 배치"

Step_3:
  title: "디자인 커스터마이징"
  description: "색상, 폰트, 레이아웃을 브랜드에 맞게 조정"

Step_4:
  title: "발행 및 공유"
  description: "클릭 한 번으로 발행하고 고유 URL로 고객에게 공유"
```

#### Features Detail (6개)
```yaml
Features:
  - title: "섹션 라이브러리"
    description: "Hero, Features, Pricing, Testimonials, FAQ 등 20+ 섹션"

  - title: "폼 빌더"
    description: "문의, 상담 신청, 뉴스레터 등 다양한 폼 자동 생성"

  - title: "A/B 테스팅 (PRO)"
    description: "여러 버전 테스트로 최고 성과 페이지 발견"

  - title: "SEO 최적화"
    description: "메타 태그, Open Graph, 사이트맵 자동 생성"

  - title: "커스텀 도메인"
    description: "본인의 도메인 연결로 전문성 강화"

  - title: "애널리틱스 통합"
    description: "Google Analytics, Facebook Pixel 자동 연동"
```

#### Use Cases (2개)
```yaml
UseCase_1:
  title: "신규 서비스 런칭"
  description: "스타트업 A사는 랜딩페이지 빌더로 48시간 만에 MVP 페이지를 제작하고 100명의 얼리어답터를 확보했습니다."

UseCase_2:
  title: "마케팅 캠페인"
  description: "교육업체 B사는 각 과정별 랜딩페이지를 제작하여 광고 전환율을 35% 향상시켰습니다."
```

#### Pricing Callout
```yaml
message: "이 기능은 베이직 플랜과 프로 플랜 모두에서 사용 가능합니다"
note: "프로 플랜에서는 A/B 테스팅 및 무제한 페이지 생성이 가능합니다"
```

#### Related Features
```yaml
Related:
  - "DB 관리" (폼 제출 자동 저장)
  - "트래픽 분석" (방문자 행동 분석)
```

---

### 2. DB 관리 (`/features/database-management`)

#### Hero Section
```yaml
Icon: ChartBarIcon (from-blue-500 to-cyan-500)
Title: "DB 관리"
Subtitle: "엑셀은 이제 그만. 스프레드시트보다 10배 빠른 리드 관리 시스템"
CTA Primary: "무료로 시작하기"
CTA Secondary: "데모 보기"
```

#### Key Benefits (3개)
```yaml
Benefit_1:
  title: "상태별 자동 분류"
  description: "신규, 진행중, 완료 등 리드 상태를 자동으로 분류하고 추적합니다"
  icon: FunnelIcon

Benefit_2:
  title: "담당자 자동 배정"
  description: "라운드 로빈, 지역별, 부서별 규칙으로 자동 배정"
  icon: UserGroupIcon

Benefit_3:
  title: "실시간 협업"
  description: "팀원 모두가 실시간으로 동일한 DB를 보며 작업"
  icon: BoltIcon
```

#### How It Works (4 steps)
```yaml
Step_1:
  title: "리드 수집"
  description: "랜딩페이지 폼, 수동 입력, CSV 업로드로 리드 추가"

Step_2:
  title: "자동 분류"
  description: "설정한 규칙에 따라 상태, 담당자 자동 배정"

Step_3:
  title: "상담 진행"
  description: "메모, 파일 첨부, 일정 설정으로 상담 관리"

Step_4:
  title: "완료 및 분석"
  description: "성과 분석 및 다음 단계 액션 자동 추천"
```

#### Features Detail (6개)
```yaml
Features:
  - title: "커스텀 필드"
    description: "업종에 맞는 커스텀 필드 추가 (텍스트, 숫자, 날짜, 선택 등)"

  - title: "필터 및 검색"
    description: "복잡한 조건으로 필터링하고 저장된 뷰로 빠르게 접근"

  - title: "대량 작업"
    description: "여러 리드를 선택하여 일괄 상태 변경, 담당자 변경"

  - title: "히스토리 추적"
    description: "모든 변경 사항과 상담 내역을 타임라인으로 확인"

  - title: "이메일/SMS 통합"
    description: "DB에서 바로 이메일 및 SMS 발송 (PRO)"

  - title: "Excel/CSV 가져오기/내보내기"
    description: "기존 데이터 마이그레이션 및 백업"
```

#### Use Cases (2개)
```yaml
UseCase_1:
  title: "부동산 중개"
  description: "부동산 C사는 매물 문의 리드를 자동 분류하여 응답 시간을 70% 단축했습니다."

UseCase_2:
  title: "컨설팅 회사"
  description: "컨설팅 D사는 상담 히스토리 추적으로 고객 재계약률을 50% 향상시켰습니다."
```

#### Pricing Callout
```yaml
message: "이 기능은 베이직 플랜과 프로 플랜 모두에서 사용 가능합니다"
note: "프로 플랜에서는 이메일/SMS 통합 및 고급 자동화 기능을 제공합니다"
```

#### Related Features
```yaml
Related:
  - "랜딩페이지 빌더" (폼 자동 연동)
  - "스케줄 관리" (상담 일정 연동)
```

---

### 3. 트래픽 분석 (`/features/traffic-analytics`)

#### Hero Section
```yaml
Icon: ChartPieIcon (from-violet-500 to-purple-500)
Title: "트래픽 분석"
Subtitle: "실시간 방문자 추적과 전환율 분석으로 마케팅 ROI 극대화"
CTA Primary: "무료로 시작하기"
CTA Secondary: "데모 보기"
Badge: "PRO 전용"
```

#### Key Benefits (4개)
```yaml
Benefit_1:
  title: "실시간 트래픽 대시보드"
  description: "지금 이 순간 방문자 수, 유입 경로, 체류 시간을 실시간으로 확인"
  icon: ChartBarIcon

Benefit_2:
  title: "유입 경로 분석"
  description: "Google, Facebook, 네이버 광고 등 어디서 방문자가 오는지 추적"
  icon: ArrowTrendingUpIcon

Benefit_3:
  title: "전환 퍼널 추적"
  description: "방문 → 폼 작성 → 제출까지 단계별 전환율 분석"
  icon: FunnelIcon

Benefit_4:
  title: "UTM 파라미터 자동 분석"
  description: "캠페인별, 매체별, 키워드별 성과를 자동으로 분류"
  icon: TagIcon
```

#### How It Works (3 steps)
```yaml
Step_1:
  title: "자동 추적 코드 설치"
  description: "랜딩페이지에 자동으로 추적 코드가 삽입됩니다"

Step_2:
  title: "실시간 데이터 수집"
  description: "방문자 행동, 클릭, 전환 등 모든 이벤트 자동 수집"

Step_3:
  title: "인사이트 도출"
  description: "AI가 성과 개선 포인트를 자동으로 추천"
```

#### Features Detail (6개)
```yaml
Features:
  - title: "페이지별 성과"
    description: "각 랜딩페이지의 방문자, 이탈률, 전환율 비교"

  - title: "디바이스 분석"
    description: "PC, 모바일, 태블릿별 방문자 비율 및 전환율"

  - title: "지역 분석"
    description: "국가, 도시별 방문자 분포 및 성과"

  - title: "시간대 분석"
    description: "시간대별, 요일별 트래픽 패턴 분석"

  - title: "이벤트 추적"
    description: "버튼 클릭, 스크롤, 동영상 재생 등 커스텀 이벤트 추적"

  - title: "커스텀 리포트"
    description: "원하는 메트릭을 조합하여 커스텀 대시보드 생성"
```

#### Use Cases (2개)
```yaml
UseCase_1:
  title: "광고 최적화"
  description: "이커머스 E사는 UTM 분석으로 저성과 광고를 중단하고 ROAS를 200% 개선했습니다."

UseCase_2:
  title: "랜딩페이지 개선"
  description: "SaaS F사는 이탈률 분석으로 문제 섹션을 발견하고 전환율을 45% 향상시켰습니다."
```

#### Pricing Callout
```yaml
message: "이 기능은 프로 플랜 전용입니다"
note: "14일 무료 체험으로 모든 분석 기능을 경험해보세요"
```

#### Related Features
```yaml
Related:
  - "랜딩페이지 빌더" (페이지 성과 추적)
  - "DB 리포트" (리드 분석 연동)
```

---

### 4. DB 리포트 (`/features/database-reports`)

#### Hero Section
```yaml
Icon: DocumentChartBarIcon (from-amber-500 to-orange-500)
Title: "DB 리포트"
Subtitle: "날짜별, 부서별, 담당자별 성과를 한눈에 파악하고 데이터 기반 의사결정"
CTA Primary: "무료로 시작하기"
CTA Secondary: "데모 보기"
Badge: "PRO 전용"
```

#### Key Benefits (4개)
```yaml
Benefit_1:
  title: "기간별 DB 현황"
  description: "일, 주, 월, 분기별 리드 수집 추이와 전환율 분석"
  icon: CalendarIcon

Benefit_2:
  title: "팀원 성과 비교"
  description: "담당자별 리드 처리량, 전환율, 응답 시간 비교"
  icon: UserGroupIcon

Benefit_3:
  title: "매출 분석"
  description: "리드별 예상 매출, 실제 매출, 수익률 추적"
  icon: CurrencyDollarIcon

Benefit_4:
  title: "자동 리포트 생성"
  description: "매주/매월 자동으로 성과 리포트를 이메일로 수신"
  icon: DocumentTextIcon
```

#### How It Works (3 steps)
```yaml
Step_1:
  title: "데이터 자동 집계"
  description: "DB의 모든 활동이 자동으로 집계됩니다"

Step_2:
  title: "리포트 확인"
  description: "대시보드에서 원하는 기간, 필터로 리포트 확인"

Step_3:
  title: "인사이트 도출"
  description: "성과 트렌드와 개선 포인트를 자동으로 추천"
```

#### Features Detail (6개)
```yaml
Features:
  - title: "전환 퍼널 리포트"
    description: "신규 리드 → 상담 → 계약 단계별 전환율 분석"

  - title: "담당자 성과 리포트"
    description: "팀원별 리드 처리 속도, 성공률, 매출 기여도"

  - title: "유입 경로 분석"
    description: "어떤 마케팅 채널이 가장 좋은 리드를 가져오는지 분석"

  - title: "예측 분석"
    description: "과거 데이터 기반으로 다음 달 리드 수 예측"

  - title: "커스텀 대시보드"
    description: "원하는 메트릭을 조합하여 맞춤 대시보드 생성"

  - title: "Excel/PDF 내보내기"
    description: "리포트를 Excel, PDF로 내보내기 및 공유"
```

#### Use Cases (2개)
```yaml
UseCase_1:
  title: "세일즈 팀 관리"
  description: "보험사 G사는 팀원 성과 리포트로 코칭 포인트를 발견하고 팀 전환율을 30% 향상시켰습니다."

UseCase_2:
  title: "마케팅 예산 최적화"
  description: "법률사무소 H사는 유입 경로 분석으로 저성과 채널을 중단하고 마케팅 비용을 40% 절감했습니다."
```

#### Pricing Callout
```yaml
message: "이 기능은 프로 플랜 전용입니다"
note: "14일 무료 체험으로 모든 리포트 기능을 경험해보세요"
```

#### Related Features
```yaml
Related:
  - "DB 관리" (리드 데이터 연동)
  - "트래픽 분석" (웹 분석 연동)
```

---

### 5. 스케줄 관리 (`/features/schedule-management`)

#### Hero Section
```yaml
Icon: CalendarDaysIcon (from-green-500 to-emerald-500)
Title: "스케줄 관리"
Subtitle: "DB와 연동된 스마트 캘린더로 상담 일정과 팀 스케줄을 한곳에서 관리"
CTA Primary: "무료로 시작하기"
CTA Secondary: "데모 보기"
Badge: "PRO 전용"
```

#### Key Benefits (4개)
```yaml
Benefit_1:
  title: "DB 연동 자동 일정 생성"
  description: "리드 상태가 '상담 예정'으로 변경되면 자동으로 캘린더에 추가"
  icon: CalendarIcon

Benefit_2:
  title: "담당자 자동 배정"
  description: "팀원 가용 시간을 고려한 스마트 일정 배정"
  icon: UserPlusIcon

Benefit_3:
  title: "알림 및 리마인더"
  description: "이메일, SMS, 앱 푸시로 일정 전 자동 알림"
  icon: BellIcon

Benefit_4:
  title: "Google/Outlook 동기화"
  description: "기존 사용 중인 캘린더와 양방향 동기화"
  icon: ArrowPathIcon
```

#### How It Works (4 steps)
```yaml
Step_1:
  title: "일정 생성"
  description: "DB에서 리드 선택 → 일정 추가 또는 자동 생성 규칙 설정"

Step_2:
  title: "담당자 배정"
  description: "가용 시간 기반 자동 배정 또는 수동 선택"

Step_3:
  title: "알림 발송"
  description: "담당자와 고객에게 일정 전 자동 알림"

Step_4:
  title: "완료 및 기록"
  description: "상담 완료 후 메모 작성 및 DB에 자동 기록"
```

#### Features Detail (6개)
```yaml
Features:
  - title: "캘린더 뷰"
    description: "일, 주, 월 단위로 팀 전체 일정 확인"

  - title: "일정 템플릿"
    description: "자주 사용하는 상담 유형별 템플릿 저장"

  - title: "회의실 예약"
    description: "사무실 회의실 및 리소스 예약 관리"

  - title: "고객 셀프 예약"
    description: "고객이 직접 가능한 시간대를 선택하여 예약"

  - title: "일정 충돌 방지"
    description: "중복 예약 자동 감지 및 대안 시간 추천"

  - title: "타임존 지원"
    description: "해외 고객 대응을 위한 다중 타임존 관리"
```

#### Use Cases (2개)
```yaml
UseCase_1:
  title: "의료 상담 예약"
  description: "클리닉 I는 셀프 예약 기능으로 전화 응대 시간을 80% 절감했습니다."

UseCase_2:
  title: "영업 팀 스케줄링"
  description: "솔루션 J사는 자동 배정 기능으로 영업 팀의 일정 관리 시간을 90% 단축했습니다."
```

#### Pricing Callout
```yaml
message: "이 기능은 프로 플랜 전용입니다"
note: "14일 무료 체험으로 스마트 스케줄링을 경험해보세요"
```

#### Related Features
```yaml
Related:
  - "DB 관리" (리드 연동 일정)
  - "팀 협업" (팀 캘린더 공유)
```

---

### 6. 팀 협업 (`/features/team-collaboration`)

#### Hero Section
```yaml
Icon: UsersIcon (from-indigo-500 to-blue-500)
Title: "팀 협업"
Subtitle: "회사 단위 관리로 모든 팀원이 실시간으로 DB와 일정을 공유하며 협업"
CTA Primary: "무료로 시작하기"
CTA Secondary: "데모 보기"
```

#### Key Benefits (4개)
```yaml
Benefit_1:
  title: "무제한 팀원 초대"
  description: "팀 크기에 관계없이 모든 팀원을 무료로 초대"
  icon: UserGroupIcon

Benefit_2:
  title: "역할 기반 권한 관리"
  description: "관리자, 매니저, 팀원별 세밀한 접근 권한 설정"
  icon: ShieldCheckIcon

Benefit_3:
  title: "실시간 활동 추적"
  description: "누가 어떤 리드를 작업 중인지 실시간으로 확인"
  icon: BoltIcon

Benefit_4:
  title: "댓글 및 멘션"
  description: "리드에 댓글 달고 팀원 멘션으로 협업 강화"
  icon: ChatBubbleLeftIcon
```

#### How It Works (4 steps)
```yaml
Step_1:
  title: "팀원 초대"
  description: "이메일 주소로 팀원을 초대하고 역할 배정"

Step_2:
  title: "권한 설정"
  description: "팀원별 DB 접근 권한, 기능 사용 권한 설정"

Step_3:
  title: "실시간 협업"
  description: "댓글, 멘션, 활동 알림으로 팀과 소통"

Step_4:
  title: "성과 모니터링"
  description: "팀원 활동 로그 및 성과를 대시보드에서 확인"
```

#### Features Detail (6개)
```yaml
Features:
  - title: "팀원 초대 시스템"
    description: "이메일 초대 링크로 간편하게 팀원 추가"

  - title: "역할 및 권한 관리"
    description: "관리자, 매니저, 팀원, 읽기 전용 등 역할별 권한 설정"

  - title: "활동 로그"
    description: "모든 팀원의 DB 수정, 상태 변경 이력 자동 기록"

  - title: "댓글 및 멘션"
    description: "리드별 댓글 스레드 및 @멘션으로 팀원 호출"

  - title: "알림 센터"
    description: "나에게 배정된 리드, 멘션, 일정 등 통합 알림"

  - title: "감사 로그 (Audit Log)"
    description: "보안을 위한 모든 중요 활동 기록 및 추적"
```

#### Use Cases (2개)
```yaml
UseCase_1:
  title: "원격 팀 협업"
  description: "마케팅 에이전시 K사는 실시간 협업 기능으로 원격 팀의 생산성을 50% 향상시켰습니다."

UseCase_2:
  title: "프랜차이즈 관리"
  description: "프랜차이즈 L사는 권한 관리로 본사와 각 지점의 DB를 안전하게 분리 관리하고 있습니다."
```

#### Pricing Callout
```yaml
message: "이 기능은 베이직 플랜과 프로 플랜 모두에서 사용 가능합니다"
note: "베이직: 팀원 3명까지 | 프로: 무제한 팀원"
```

#### Related Features
```yaml
Related:
  - "DB 관리" (공유 DB 작업)
  - "스케줄 관리" (팀 캘린더)
```

---

## 📊 기능 비교표 페이지 (`/features/comparison`)

### Hero Section
```yaml
Title: "전체 기능 비교"
Subtitle: "베이직 플랜과 프로 플랜의 모든 기능을 한눈에 비교하고 최적의 플랜을 선택하세요"
Toggle: "베이직 (₩19,000/월) ⇄ 프로 (₩49,000/월)"
```

### 비교표 구조

#### Table Header (Sticky)
```yaml
Columns:
  - "기능" (left-aligned, bold)
  - "베이직" (center, ₩19,000/월)
  - "프로" (center, ₩49,000/월)
```

#### 1. 랜딩페이지 기능
```yaml
Category_Header: "랜딩페이지 빌더"

Features:
  - feature: "랜딩페이지 생성"
    basic: "3개"
    pro: "무제한"

  - feature: "템플릿 라이브러리"
    basic: "✓ 30+ 템플릿"
    pro: "✓ 30+ 템플릿"

  - feature: "비주얼 에디터"
    basic: "✓"
    pro: "✓"

  - feature: "모바일 반응형"
    basic: "✓"
    pro: "✓"

  - feature: "커스텀 도메인"
    basic: "✓"
    pro: "✓"

  - feature: "A/B 테스팅"
    basic: "✗"
    pro: "✓"

  - feature: "고급 SEO 도구"
    basic: "기본"
    pro: "고급"
```

#### 2. DB 관리 기능
```yaml
Category_Header: "DB 관리"

Features:
  - feature: "리드 저장"
    basic: "1,000개/월"
    pro: "무제한"

  - feature: "커스텀 필드"
    basic: "✓"
    pro: "✓"

  - feature: "상태별 워크플로우"
    basic: "✓"
    pro: "✓"

  - feature: "담당자 자동 배정"
    basic: "✓"
    pro: "✓"

  - feature: "히스토리 추적"
    basic: "✓"
    pro: "✓"

  - feature: "이메일/SMS 통합"
    basic: "✗"
    pro: "✓"

  - feature: "Excel/CSV 가져오기"
    basic: "✓"
    pro: "✓"
```

#### 3. 트래픽 분석 기능
```yaml
Category_Header: "트래픽 분석"

Features:
  - feature: "실시간 트래픽 대시보드"
    basic: "✗"
    pro: "✓"

  - feature: "유입 경로 분석"
    basic: "✗"
    pro: "✓"

  - feature: "전환 퍼널 추적"
    basic: "✗"
    pro: "✓"

  - feature: "UTM 파라미터 분석"
    basic: "✗"
    pro: "✓"

  - feature: "페이지별 성과"
    basic: "✗"
    pro: "✓"

  - feature: "커스텀 이벤트 추적"
    basic: "✗"
    pro: "✓"
```

#### 4. DB 리포트 기능
```yaml
Category_Header: "DB 리포트"

Features:
  - feature: "기간별 DB 현황"
    basic: "✗"
    pro: "✓"

  - feature: "팀원 성과 비교"
    basic: "✗"
    pro: "✓"

  - feature: "매출 분석"
    basic: "✗"
    pro: "✓"

  - feature: "자동 리포트 생성"
    basic: "✗"
    pro: "✓"

  - feature: "커스텀 대시보드"
    basic: "✗"
    pro: "✓"

  - feature: "Excel/PDF 내보내기"
    basic: "✗"
    pro: "✓"
```

#### 5. 스케줄 관리 기능
```yaml
Category_Header: "스케줄 관리"

Features:
  - feature: "캘린더 뷰"
    basic: "✗"
    pro: "✓"

  - feature: "DB 연동 자동 일정"
    basic: "✗"
    pro: "✓"

  - feature: "담당자 자동 배정"
    basic: "✗"
    pro: "✓"

  - feature: "고객 셀프 예약"
    basic: "✗"
    pro: "✓"

  - feature: "Google/Outlook 동기화"
    basic: "✗"
    pro: "✓"

  - feature: "알림 및 리마인더"
    basic: "✗"
    pro: "✓"
```

#### 6. 팀 협업 기능
```yaml
Category_Header: "팀 협업"

Features:
  - feature: "팀원 수"
    basic: "3명"
    pro: "무제한"

  - feature: "역할 및 권한 관리"
    basic: "✓"
    pro: "✓"

  - feature: "실시간 활동 추적"
    basic: "✓"
    pro: "✓"

  - feature: "댓글 및 멘션"
    basic: "✓"
    pro: "✓"

  - feature: "알림 센터"
    basic: "✓"
    pro: "✓"

  - feature: "감사 로그 (Audit Log)"
    basic: "✗"
    pro: "✓"
```

#### 7. 지원 및 서비스
```yaml
Category_Header: "지원 및 서비스"

Features:
  - feature: "고객 지원"
    basic: "이메일 지원"
    pro: "우선 지원 + 채팅"

  - feature: "온보딩 지원"
    basic: "셀프 가이드"
    pro: "1:1 온보딩"

  - feature: "데이터 백업"
    basic: "주 1회"
    pro: "실시간"

  - feature: "SLA 보장"
    basic: "99% 가동률"
    pro: "99.9% 가동률"

  - feature: "API 접근"
    basic: "✗"
    pro: "✓"
```

### Plan Recommendation Section
```yaml
Question: "어떤 플랜이 적합할까요?"

Basic_Card:
  title: "베이직 플랜 추천 대상"
  price: "₩19,000/월"
  recommended_for:
    - "랜딩페이지 3개 이하로 운영"
    - "월 1,000개 이하의 리드 관리"
    - "팀원 3명 이하의 소규모 팀"
    - "기본 DB 관리 및 협업 기능만 필요"
  cta: "베이직으로 시작하기"

Pro_Card:
  title: "프로 플랜 추천 대상"
  price: "₩49,000/월"
  badge: "가장 인기"
  recommended_for:
    - "무제한 랜딩페이지 운영"
    - "월 1,000개 이상의 리드 관리"
    - "트래픽 분석 및 리포트 필요"
    - "스케줄 관리 및 자동화 기능 필요"
    - "팀원 4명 이상의 조직"
  cta: "프로로 시작하기 (14일 무료)"
```

### FAQ Section (플랜 관련)
```yaml
Questions:
  - q: "플랜을 중간에 변경할 수 있나요?"
    a: "네, 언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드는 즉시 적용되며, 다운그레이드는 다음 결제일부터 적용됩니다."

  - q: "베이직에서 프로로 업그레이드하면 데이터는 어떻게 되나요?"
    a: "모든 데이터는 그대로 유지됩니다. 업그레이드 즉시 프로 플랜의 모든 기능을 사용할 수 있습니다."

  - q: "팀원 수를 초과하면 어떻게 되나요?"
    a: "베이직 플랜에서 3명을 초과하는 팀원을 초대하려면 프로 플랜으로 업그레이드가 필요합니다."

  - q: "월 리드 수를 초과하면 추가 요금이 발생하나요?"
    a: "베이직 플랜에서 1,000개를 초과할 경우 프로 플랜으로 업그레이드를 권장합니다. 추가 요금은 발생하지 않지만 기능이 제한될 수 있습니다."
```

---

## 🛠️ 기술 구현 가이드

### 라우팅 구조
```typescript
// app/features/[slug]/page.tsx
export async function generateStaticParams() {
  return [
    { slug: 'landing-page-builder' },
    { slug: 'database-management' },
    { slug: 'traffic-analytics' },
    { slug: 'database-reports' },
    { slug: 'schedule-management' },
    { slug: 'team-collaboration' },
  ]
}

// app/features/comparison/page.tsx
export default function ComparisonPage() {
  // 비교표 페이지 구현
}
```

### 컴포넌트 구조
```
src/components/features/
├── detail/
│   ├── FeatureHero.tsx
│   ├── KeyBenefits.tsx
│   ├── HowItWorks.tsx
│   ├── FeaturesDetail.tsx
│   ├── UseCases.tsx
│   ├── PricingCallout.tsx
│   └── RelatedFeatures.tsx
├── comparison/
│   ├── ComparisonHero.tsx
│   ├── ComparisonTable.tsx
│   ├── PlanRecommendation.tsx
│   └── ComparisonFAQ.tsx
└── shared/
    ├── FeatureIcon.tsx
    ├── ProBadge.tsx
    └── CheckIcon.tsx
```

### SEO 최적화
```typescript
// 각 상세 페이지 metadata
export const metadata = {
  title: '랜딩페이지 빌더 - 퍼널리',
  description: '코딩 없이 드래그 앤 드롭으로 전문가 수준의 랜딩페이지를 만드세요...',
  openGraph: {
    title: '랜딩페이지 빌더 - 퍼널리',
    description: '코딩 없이 드래그 앤 드롭으로...',
    images: ['/og-landing-page-builder.png'],
  },
}

// 비교표 페이지 metadata
export const metadata = {
  title: '전체 기능 비교 - 퍼널리',
  description: '베이직 플랜과 프로 플랜의 모든 기능을 한눈에 비교하고...',
}
```

### 애니메이션
```typescript
// Framer Motion variants (기존 홈페이지와 동일)
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}
```

---

## 📱 반응형 디자인

### Breakpoints (Tailwind 기본)
```css
sm: 640px   /* 모바일 가로, 작은 태블릿 */
md: 768px   /* 태블릿 */
lg: 1024px  /* 작은 데스크톱 */
xl: 1280px  /* 데스크톱 */
2xl: 1536px /* 큰 데스크톱 */
```

### 반응형 레이아웃
```yaml
Mobile (< 640px):
  - Hero: 1 column, smaller text
  - Benefits: 1 column grid
  - How It Works: Vertical timeline
  - Features: 1 column
  - Comparison Table: Horizontal scroll

Tablet (640-1024px):
  - Hero: 1 column, medium text
  - Benefits: 2 column grid
  - How It Works: Vertical timeline
  - Features: 2 column grid
  - Comparison Table: Fixed columns

Desktop (> 1024px):
  - Hero: 2 column (content + image)
  - Benefits: 3-4 column grid
  - How It Works: Horizontal steps
  - Features: 3 column grid
  - Comparison Table: Full width sticky header
```

---

## 🎯 최종 체크리스트

### 페이지별 구현 항목
- [ ] 랜딩페이지 빌더 상세 페이지
- [ ] DB 관리 상세 페이지
- [ ] 트래픽 분석 상세 페이지
- [ ] DB 리포트 상세 페이지
- [ ] 스케줄 관리 상세 페이지
- [ ] 팀 협업 상세 페이지
- [ ] 기능 비교표 페이지

### 디자인 요소
- [ ] Framer Motion 애니메이션 적용
- [ ] 반응형 레이아웃 구현
- [ ] 기존 홈페이지 디자인 시스템 준수
- [ ] Pro Badge 적용
- [ ] Gradient 아이콘 적용

### SEO 및 성능
- [ ] 각 페이지 metadata 설정
- [ ] Open Graph 이미지 생성
- [ ] Image lazy loading
- [ ] Code splitting

### 내비게이션
- [ ] Breadcrumb 내비게이션
- [ ] 관련 기능 링크
- [ ] 기능 비교표 링크
- [ ] CTA 버튼 링크

---

**설계 완료일**: 2025-12-26
**총 페이지 수**: 7개
**디자인 컨셉**: 마케팅 홈페이지 일관성 유지
**예상 구현 시간**: 4-6시간
