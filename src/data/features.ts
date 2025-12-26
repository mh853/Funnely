import { IconName } from '@/utils/iconMap'

export interface Feature {
  slug: string
  name: string
  title: string
  subtitle: string
  icon: IconName
  iconGradient: string
  isPro: boolean

  keyBenefits: {
    title: string
    description: string
    icon: IconName
  }[]

  howItWorks: {
    title: string
    description: string
  }[]

  featuresDetail: {
    title: string
    description: string
  }[]

  useCases: {
    title: string
    description: string
  }[]

  pricingCallout: {
    message: string
    note: string
  }

  relatedFeatures: {
    name: string
    description: string
    icon: IconName
    iconColor: string
    href: string
  }[]
}

export const features: Feature[] = [
  {
    slug: 'landing-page-builder',
    name: '랜딩페이지 빌더',
    title: '랜딩페이지 빌더',
    subtitle: '코딩 없이 드래그 앤 드롭으로 전문가 수준의 랜딩페이지를 만드세요',
    icon: 'PaintBrushIcon',
    iconGradient: 'from-pink-500 to-rose-500',
    isPro: false,

    keyBenefits: [
      {
        title: '직관적인 비주얼 에디터',
        description: '코딩 지식 없이도 드래그 앤 드롭으로 쉽게 제작할 수 있습니다',
        icon: 'CursorArrowRaysIcon',
      },
      {
        title: '30+ 전문 템플릿',
        description: '산업별 최적화된 템플릿으로 5분 만에 랜딩페이지 완성',
        icon: 'RectangleStackIcon',
      },
      {
        title: '실시간 모바일 프리뷰',
        description: 'PC, 태블릿, 모바일 화면에서 실시간으로 확인하며 제작',
        icon: 'DevicePhoneMobileIcon',
      },
    ],

    howItWorks: [
      {
        title: '템플릿 선택',
        description: '산업별 최적화된 템플릿 중 선택하거나 빈 페이지에서 시작',
      },
      {
        title: '콘텐츠 편집',
        description: '텍스트, 이미지, 버튼 등을 드래그 앤 드롭으로 배치',
      },
      {
        title: '디자인 커스터마이징',
        description: '색상, 폰트, 레이아웃을 브랜드에 맞게 조정',
      },
      {
        title: '발행 및 공유',
        description: '클릭 한 번으로 발행하고 고유 URL로 고객에게 공유',
      },
    ],

    featuresDetail: [
      {
        title: '섹션 라이브러리',
        description: 'Hero, Features, Pricing, Testimonials, FAQ 등 20+ 섹션',
      },
      {
        title: '폼 빌더',
        description: '문의, 상담 신청, 뉴스레터 등 다양한 폼 자동 생성',
      },
      {
        title: 'A/B 테스팅 (PRO)',
        description: '여러 버전 테스트로 최고 성과 페이지 발견',
      },
      {
        title: 'SEO 최적화',
        description: '메타 태그, Open Graph, 사이트맵 자동 생성',
      },
      {
        title: '커스텀 도메인',
        description: '본인의 도메인 연결로 전문성 강화',
      },
      {
        title: '애널리틱스 통합',
        description: 'Google Analytics, Facebook Pixel 자동 연동',
      },
    ],

    useCases: [
      {
        title: '신규 서비스 런칭',
        description: '스타트업 A사는 랜딩페이지 빌더로 48시간 만에 MVP 페이지를 제작하고 100명의 얼리어답터를 확보했습니다.',
      },
      {
        title: '마케팅 캠페인',
        description: '교육업체 B사는 각 과정별 랜딩페이지를 제작하여 광고 전환율을 35% 향상시켰습니다.',
      },
    ],

    pricingCallout: {
      message: '이 기능은 베이직 플랜과 프로 플랜 모두에서 사용 가능합니다',
      note: '프로 플랜에서는 A/B 테스팅 및 무제한 페이지 생성이 가능합니다',
    },

    relatedFeatures: [
      {
        name: 'DB 관리',
        description: '폼 제출을 자동으로 DB에 저장하고 관리하세요',
        icon: 'ChartBarIcon',
        iconColor: 'from-blue-500 to-cyan-500',
        href: '/features/database-management',
      },
      {
        name: '트래픽 분석',
        description: '방문자 행동을 분석하고 전환율을 높이세요',
        icon: 'ChartPieIcon',
        iconColor: 'from-violet-500 to-purple-500',
        href: '/features/traffic-analytics',
      },
    ],
  },

  {
    slug: 'database-management',
    name: 'DB 관리',
    title: 'DB 관리',
    subtitle: '엑셀은 이제 그만. 스프레드시트보다 10배 빠른 리드 관리 시스템',
    icon: 'ChartBarIcon',
    iconGradient: 'from-blue-500 to-cyan-500',
    isPro: false,

    keyBenefits: [
      {
        title: '상태별 자동 분류',
        description: '신규, 진행중, 완료 등 리드 상태를 자동으로 분류하고 추적합니다',
        icon: 'FunnelIcon',
      },
      {
        title: '담당자 자동 배정',
        description: '라운드 로빈, 지역별, 부서별 규칙으로 자동 배정',
        icon: 'UserGroupIcon',
      },
      {
        title: '실시간 협업',
        description: '팀원 모두가 실시간으로 동일한 DB를 보며 작업',
        icon: 'BoltIcon',
      },
    ],

    howItWorks: [
      {
        title: '리드 수집',
        description: '랜딩페이지 폼, 수동 입력, CSV 업로드로 리드 추가',
      },
      {
        title: '자동 분류',
        description: '설정한 규칙에 따라 상태, 담당자 자동 배정',
      },
      {
        title: '상담 진행',
        description: '메모, 파일 첨부, 일정 설정으로 상담 관리',
      },
      {
        title: '완료 및 분석',
        description: '성과 분석 및 다음 단계 액션 자동 추천',
      },
    ],

    featuresDetail: [
      {
        title: '커스텀 필드',
        description: '업종에 맞는 커스텀 필드 추가 (텍스트, 숫자, 날짜, 선택 등)',
      },
      {
        title: '필터 및 검색',
        description: '복잡한 조건으로 필터링하고 저장된 뷰로 빠르게 접근',
      },
      {
        title: '대량 작업',
        description: '여러 리드를 선택하여 일괄 상태 변경, 담당자 변경',
      },
      {
        title: '히스토리 추적',
        description: '모든 변경 사항과 상담 내역을 타임라인으로 확인',
      },
      {
        title: '이메일/SMS 통합',
        description: 'DB에서 바로 이메일 및 SMS 발송 (PRO)',
      },
      {
        title: 'Excel/CSV 가져오기/내보내기',
        description: '기존 데이터 마이그레이션 및 백업',
      },
    ],

    useCases: [
      {
        title: '부동산 중개',
        description: '부동산 C사는 매물 문의 리드를 자동 분류하여 응답 시간을 70% 단축했습니다.',
      },
      {
        title: '컨설팅 회사',
        description: '컨설팅 D사는 상담 히스토리 추적으로 고객 재계약률을 50% 향상시켰습니다.',
      },
    ],

    pricingCallout: {
      message: '이 기능은 베이직 플랜과 프로 플랜 모두에서 사용 가능합니다',
      note: '프로 플랜에서는 이메일/SMS 통합 및 고급 자동화 기능을 제공합니다',
    },

    relatedFeatures: [
      {
        name: '랜딩페이지 빌더',
        description: '폼을 자동으로 DB와 연동하세요',
        icon: 'PaintBrushIcon',
        iconColor: 'from-pink-500 to-rose-500',
        href: '/features/landing-page-builder',
      },
      {
        name: '스케줄 관리',
        description: '상담 일정을 캘린더와 연동하세요',
        icon: 'CalendarDaysIcon',
        iconColor: 'from-green-500 to-emerald-500',
        href: '/features/schedule-management',
      },
    ],
  },

  {
    slug: 'traffic-analytics',
    name: '트래픽 분석',
    title: '트래픽 분석',
    subtitle: '실시간 방문자 추적과 전환율 분석으로 마케팅 ROI 극대화',
    icon: 'ChartPieIcon',
    iconGradient: 'from-violet-500 to-purple-500',
    isPro: true,

    keyBenefits: [
      {
        title: '실시간 트래픽 대시보드',
        description: '지금 이 순간 방문자 수, 유입 경로, 체류 시간을 실시간으로 확인',
        icon: 'ChartBarIcon',
      },
      {
        title: '유입 경로 분석',
        description: 'Google, Facebook, 네이버 광고 등 어디서 방문자가 오는지 추적',
        icon: 'ArrowTrendingUpIcon',
      },
      {
        title: '전환 퍼널 추적',
        description: '방문 → 폼 작성 → 제출까지 단계별 전환율 분석',
        icon: 'FunnelIcon',
      },
      {
        title: 'UTM 파라미터 자동 분석',
        description: '캠페인별, 매체별, 키워드별 성과를 자동으로 분류',
        icon: 'TagIcon',
      },
    ],

    howItWorks: [
      {
        title: '자동 추적 코드 설치',
        description: '랜딩페이지에 자동으로 추적 코드가 삽입됩니다',
      },
      {
        title: '실시간 데이터 수집',
        description: '방문자 행동, 클릭, 전환 등 모든 이벤트 자동 수집',
      },
      {
        title: '인사이트 도출',
        description: 'AI가 성과 개선 포인트를 자동으로 추천',
      },
    ],

    featuresDetail: [
      {
        title: '페이지별 성과',
        description: '각 랜딩페이지의 방문자, 이탈률, 전환율 비교',
      },
      {
        title: '디바이스 분석',
        description: 'PC, 모바일, 태블릿별 방문자 비율 및 전환율',
      },
      {
        title: '지역 분석',
        description: '국가, 도시별 방문자 분포 및 성과',
      },
      {
        title: '시간대 분석',
        description: '시간대별, 요일별 트래픽 패턴 분석',
      },
      {
        title: '이벤트 추적',
        description: '버튼 클릭, 스크롤, 동영상 재생 등 커스텀 이벤트 추적',
      },
      {
        title: '커스텀 리포트',
        description: '원하는 메트릭을 조합하여 커스텀 대시보드 생성',
      },
    ],

    useCases: [
      {
        title: '광고 최적화',
        description: '이커머스 E사는 UTM 분석으로 저성과 광고를 중단하고 ROAS를 200% 개선했습니다.',
      },
      {
        title: '랜딩페이지 개선',
        description: 'SaaS F사는 이탈률 분석으로 문제 섹션을 발견하고 전환율을 45% 향상시켰습니다.',
      },
    ],

    pricingCallout: {
      message: '이 기능은 프로 플랜 전용입니다',
      note: '14일 무료 체험으로 모든 분석 기능을 경험해보세요',
    },

    relatedFeatures: [
      {
        name: '랜딩페이지 빌더',
        description: '페이지 성과를 실시간으로 추적하세요',
        icon: 'PaintBrushIcon',
        iconColor: 'from-pink-500 to-rose-500',
        href: '/features/landing-page-builder',
      },
      {
        name: 'DB 리포트',
        description: '리드 분석과 웹 분석을 연동하세요',
        icon: 'DocumentChartBarIcon',
        iconColor: 'from-amber-500 to-orange-500',
        href: '/features/database-reports',
      },
    ],
  },

  {
    slug: 'database-reports',
    name: 'DB 리포트',
    title: 'DB 리포트',
    subtitle: '날짜별, 부서별, 담당자별 성과를 한눈에 파악하고 데이터 기반 의사결정',
    icon: 'DocumentChartBarIcon',
    iconGradient: 'from-amber-500 to-orange-500',
    isPro: true,

    keyBenefits: [
      {
        title: '기간별 DB 현황',
        description: '일, 주, 월, 분기별 리드 수집 추이와 전환율 분석',
        icon: 'CalendarIcon',
      },
      {
        title: '팀원 성과 비교',
        description: '담당자별 리드 처리량, 전환율, 응답 시간 비교',
        icon: 'UserGroupIcon',
      },
      {
        title: '매출 분석',
        description: '리드별 예상 매출, 실제 매출, 수익률 추적',
        icon: 'CurrencyDollarIcon',
      },
      {
        title: '자동 리포트 생성',
        description: '매주/매월 자동으로 성과 리포트를 이메일로 수신',
        icon: 'DocumentTextIcon',
      },
    ],

    howItWorks: [
      {
        title: '데이터 자동 집계',
        description: 'DB의 모든 활동이 자동으로 집계됩니다',
      },
      {
        title: '리포트 확인',
        description: '대시보드에서 원하는 기간, 필터로 리포트 확인',
      },
      {
        title: '인사이트 도출',
        description: '성과 트렌드와 개선 포인트를 자동으로 추천',
      },
    ],

    featuresDetail: [
      {
        title: '전환 퍼널 리포트',
        description: '신규 리드 → 상담 → 계약 단계별 전환율 분석',
      },
      {
        title: '담당자 성과 리포트',
        description: '팀원별 리드 처리 속도, 성공률, 매출 기여도',
      },
      {
        title: '유입 경로 분석',
        description: '어떤 마케팅 채널이 가장 좋은 리드를 가져오는지 분석',
      },
      {
        title: '예측 분석',
        description: '과거 데이터 기반으로 다음 달 리드 수 예측',
      },
      {
        title: '커스텀 대시보드',
        description: '원하는 메트릭을 조합하여 맞춤 대시보드 생성',
      },
      {
        title: 'Excel/PDF 내보내기',
        description: '리포트를 Excel, PDF로 내보내기 및 공유',
      },
    ],

    useCases: [
      {
        title: '세일즈 팀 관리',
        description: '보험사 G사는 팀원 성과 리포트로 코칭 포인트를 발견하고 팀 전환율을 30% 향상시켰습니다.',
      },
      {
        title: '마케팅 예산 최적화',
        description: '법률사무소 H사는 유입 경로 분석으로 저성과 채널을 중단하고 마케팅 비용을 40% 절감했습니다.',
      },
    ],

    pricingCallout: {
      message: '이 기능은 프로 플랜 전용입니다',
      note: '14일 무료 체험으로 모든 리포트 기능을 경험해보세요',
    },

    relatedFeatures: [
      {
        name: 'DB 관리',
        description: '리드 데이터를 체계적으로 관리하세요',
        icon: 'ChartBarIcon',
        iconColor: 'from-blue-500 to-cyan-500',
        href: '/features/database-management',
      },
      {
        name: '트래픽 분석',
        description: '웹 분석과 리드 분석을 통합하세요',
        icon: 'ChartPieIcon',
        iconColor: 'from-violet-500 to-purple-500',
        href: '/features/traffic-analytics',
      },
    ],
  },

  {
    slug: 'schedule-management',
    name: '스케줄 관리',
    title: '스케줄 관리',
    subtitle: 'DB와 연동된 스마트 캘린더로 상담 일정과 팀 스케줄을 한곳에서 관리',
    icon: 'CalendarDaysIcon',
    iconGradient: 'from-green-500 to-emerald-500',
    isPro: true,

    keyBenefits: [
      {
        title: 'DB 연동 자동 일정 생성',
        description: '리드 상태가 \'상담 예정\'으로 변경되면 자동으로 캘린더에 추가',
        icon: 'CalendarIcon',
      },
      {
        title: '담당자 자동 배정',
        description: '팀원 가용 시간을 고려한 스마트 일정 배정',
        icon: 'UserPlusIcon',
      },
      {
        title: '알림 및 리마인더',
        description: '이메일, SMS, 앱 푸시로 일정 전 자동 알림',
        icon: 'BellIcon',
      },
      {
        title: 'Google/Outlook 동기화',
        description: '기존 사용 중인 캘린더와 양방향 동기화',
        icon: 'ArrowPathIcon',
      },
    ],

    howItWorks: [
      {
        title: '일정 생성',
        description: 'DB에서 리드 선택 → 일정 추가 또는 자동 생성 규칙 설정',
      },
      {
        title: '담당자 배정',
        description: '가용 시간 기반 자동 배정 또는 수동 선택',
      },
      {
        title: '알림 발송',
        description: '담당자와 고객에게 일정 전 자동 알림',
      },
      {
        title: '완료 및 기록',
        description: '상담 완료 후 메모 작성 및 DB에 자동 기록',
      },
    ],

    featuresDetail: [
      {
        title: '캘린더 뷰',
        description: '일, 주, 월 단위로 팀 전체 일정 확인',
      },
      {
        title: '가용 시간 자동 감지',
        description: '팀원 캘린더 확인하여 빈 시간에만 일정 배정',
      },
      {
        title: '반복 일정',
        description: '주간 회의, 월간 리뷰 등 반복 일정 자동 생성',
      },
      {
        title: '타임존 지원',
        description: '해외 고객 상담 시 타임존 자동 변환',
      },
      {
        title: '일정 템플릿',
        description: '상담 유형별 템플릿으로 빠른 일정 생성',
      },
      {
        title: '모바일 앱',
        description: 'iOS/Android 앱으로 이동 중에도 일정 확인',
      },
    ],

    useCases: [
      {
        title: '의료 클리닉',
        description: '치과 I원은 예약 시스템과 DB 연동으로 노쇼율을 60% 감소시켰습니다.',
      },
      {
        title: '컨설팅 회사',
        description: '컨설팅 J사는 팀 캘린더로 자원 활용률을 40% 향상시켰습니다.',
      },
    ],

    pricingCallout: {
      message: '이 기능은 프로 플랜 전용입니다',
      note: '14일 무료 체험으로 모든 스케줄 관리 기능을 경험해보세요',
    },

    relatedFeatures: [
      {
        name: 'DB 관리',
        description: '리드와 일정을 자동으로 연동하세요',
        icon: 'ChartBarIcon',
        iconColor: 'from-blue-500 to-cyan-500',
        href: '/features/database-management',
      },
      {
        name: '팀 협업',
        description: '팀원들과 일정을 공유하고 협업하세요',
        icon: 'UsersIcon',
        iconColor: 'from-indigo-500 to-blue-500',
        href: '/features/team-collaboration',
      },
    ],
  },

  {
    slug: 'team-collaboration',
    name: '팀 협업',
    title: '팀 협업',
    subtitle: '회사 단위 관리로 모든 팀원이 실시간으로 DB와 일정을 공유',
    icon: 'UsersIcon',
    iconGradient: 'from-indigo-500 to-blue-500',
    isPro: false,

    keyBenefits: [
      {
        title: '팀원 초대 시스템',
        description: '이메일로 팀원을 초대하고 즉시 협업 시작',
        icon: 'UserPlusIcon',
      },
      {
        title: '권한 관리',
        description: '역할별 접근 권한 설정 (관리자, 매니저, 멤버)',
        icon: 'ShieldCheckIcon',
      },
      {
        title: '실시간 알림',
        description: '리드 배정, 댓글, 상태 변경 시 즉시 알림',
        icon: 'BellIcon',
      },
      {
        title: '활동 추적',
        description: '팀원별 활동 내역과 성과를 실시간으로 확인',
        icon: 'ClockIcon',
      },
    ],

    howItWorks: [
      {
        title: '팀 생성',
        description: '회사 이름으로 팀을 생성하고 워크스페이스 설정',
      },
      {
        title: '팀원 초대',
        description: '이메일로 팀원 초대 및 역할 배정',
      },
      {
        title: '협업 시작',
        description: 'DB, 일정, 리포트를 팀 전체가 실시간으로 공유',
      },
      {
        title: '성과 분석',
        description: '팀 전체 및 개인별 성과를 대시보드에서 확인',
      },
    ],

    featuresDetail: [
      {
        title: '워크스페이스',
        description: '회사별 독립된 워크스페이스로 데이터 보안',
      },
      {
        title: '역할 기반 권한',
        description: '관리자, 매니저, 멤버별 세분화된 권한 설정',
      },
      {
        title: '댓글 및 멘션',
        description: '리드에 댓글 달고 @멘션으로 팀원에게 알림',
      },
      {
        title: '활동 피드',
        description: '팀 전체 활동을 타임라인으로 확인',
      },
      {
        title: '팀 대시보드',
        description: '팀 성과, 리드 현황, 목표 달성률 한눈에 확인',
      },
      {
        title: '감사 로그',
        description: '모든 변경 사항과 접근 기록 추적 (PRO)',
      },
    ],

    useCases: [
      {
        title: '영업 팀',
        description: '부동산 K사는 팀 협업 기능으로 리드 중복 처리를 90% 감소시켰습니다.',
      },
      {
        title: '고객 지원 팀',
        description: '교육업체 L사는 실시간 협업으로 고객 응답 시간을 50% 단축했습니다.',
      },
    ],

    pricingCallout: {
      message: '이 기능은 베이직 플랜과 프로 플랜 모두에서 사용 가능합니다',
      note: '프로 플랜에서는 감사 로그 및 고급 권한 관리 기능을 제공합니다',
    },

    relatedFeatures: [
      {
        name: 'DB 관리',
        description: '팀원들과 리드 DB를 실시간으로 공유하세요',
        icon: 'ChartBarIcon',
        iconColor: 'from-blue-500 to-cyan-500',
        href: '/features/database-management',
      },
      {
        name: '스케줄 관리',
        description: '팀 캘린더로 일정을 함께 관리하세요',
        icon: 'CalendarDaysIcon',
        iconColor: 'from-green-500 to-emerald-500',
        href: '/features/schedule-management',
      },
    ],
  },
]

export function getFeatureBySlug(slug: string): Feature | undefined {
  return features.find(feature => feature.slug === slug)
}

export function getAllFeatureSlugs(): string[] {
  return features.map(feature => feature.slug)
}
