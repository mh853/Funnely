# 메디씽크 (MediSync) - 프로젝트 개요

## 📋 프로젝트 정보

**프로젝트명**: 메디씽크 (MediSync)
**목적**: 병원 마케팅 담당자를 위한 통합 광고 관리 플랫폼
**타겟**: 병원 마케팅 담당자
**예상 규모**: 100개 병원 × 5명 = 500 사용자 동시 지원
**예산 전략**: 무료 티어 기반 구축

---

## 🎯 핵심 기능

### 1. 통합 광고 관리
- **지원 플랫폼**:
  - Meta (Facebook/Instagram) Ads
  - 카카오 모먼트
  - Google Ads

### 2. 주요 기능
- ✅ 광고 계정 연동 (OAuth 2.0)
- ✅ 광고 캠페인 생성/수정/삭제
- ✅ 실시간 성과 모니터링
- ✅ 통합 대시보드
- ✅ 상세 리포팅 및 분석
- ✅ Excel/PDF 내보내기
- ✅ 다중 사용자 권한 관리
- ✅ 병원별 계정 격리

---

## 🏗️ 기술 스택

### Frontend
```yaml
Framework: Next.js 14 (App Router)
Language: TypeScript
Styling: Tailwind CSS + shadcn/ui
State Management:
  - TanStack Query (React Query v5)
  - Zustand
Charts: Recharts
Forms: React Hook Form + Zod
Tables: TanStack Table
Export: jsPDF + xlsx
```

### Backend & Infrastructure
```yaml
Hosting: Vercel (무료 티어)
Database: Supabase PostgreSQL
Authentication: Supabase Auth
Storage: Supabase Storage
API Layer: Next.js API Routes (Serverless)
Caching: Vercel KV (선택적)
```

### 광고 플랫폼 API
```yaml
Meta Marketing API: v18.0
Kakao Moment API: v2
Google Ads API: v15
```

---

## 🔐 보안 및 규정 준수

### 보안 표준
- HIPAA 준수 아키텍처
- 개인정보보호법 준수
- End-to-end 암호화

### 구현 사항
- ✅ Row Level Security (RLS)
- ✅ API Key 암호화 저장
- ✅ 감사 로그 (Audit Trail)
- ✅ 역할 기반 접근 제어 (RBAC)
- ✅ 세션 타임아웃
- ✅ HTTPS 강제
- ✅ CORS 설정
- ✅ XSS/CSRF 방어

---

## 🗄️ 데이터베이스 구조

상세 스키마는 [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) 참조

### 주요 테이블
- `hospitals` - 병원 정보
- `users` - 사용자 계정
- `ad_accounts` - 광고 계정 연동 정보
- `campaigns` - 광고 캠페인
- `campaign_metrics` - 성과 데이터
- `audit_logs` - 감사 로그
- `saved_reports` - 저장된 리포트

---

## 👥 권한 시스템

### 역할 종류
1. **Hospital Owner** - 병원 소유자
   - 모든 권한 보유
   - 결제 및 병원 설정 관리

2. **Hospital Admin** - 병원 관리자
   - 사용자 관리
   - 모든 광고 계정 관리

3. **Marketing Manager** - 마케팅 매니저
   - 캠페인 전체 관리
   - 광고 계정 연동
   - 리포트 생성/내보내기

4. **Marketing Staff** - 마케팅 스태프
   - 캠페인 생성/수정
   - 리포트 조회
   - 제한적 예산 설정

5. **Viewer** - 뷰어
   - 리포트 조회만 가능

---

## 📊 리포팅 메트릭

### 기본 메트릭
- 노출수 (Impressions)
- 클릭수 (Clicks)
- 클릭률 (CTR)
- 전환수 (Conversions)
- 전환율 (CVR)
- 광고 지출 (Spend)
- 클릭당 비용 (CPC)
- 전환당 비용 (CPA)
- 광고 수익률 (ROAS)
- 도달 (Reach)
- 빈도 (Frequency)

### 고급 분석
- 플랫폼별 성과 비교
- 시계열 분석 (일/주/월/분기/년)
- 캠페인별 성과
- 광고 소재별 성과
- 타겟 오디언스별 성과
- 예산 대비 실제 지출
- ROI 분석
- 추세 예측

---

## 🚀 개발 로드맵

### Phase 1: MVP (4-6주)
**Week 1-2**: 기반 설정
- 프로젝트 초기화
- DB 스키마 구현
- 인증 시스템 (Supabase Auth)
- 병원/사용자 관리

**Week 3-4**: 첫 번째 광고 플랫폼
- Meta Ads 연동
- 기본 대시보드
- 캠페인 조회 기능

**Week 5-6**: 리포팅 v1
- 기본 메트릭 표시
- 간단한 차트
- 데이터 동기화 스케줄러

### Phase 2: 확장 (4-6주)
**Week 7-8**: 추가 플랫폼
- 카카오 모먼트 연동
- Google Ads 연동

**Week 9-10**: 고급 기능
- 캠페인 생성/수정
- 권한 시스템 고도화
- 리포트 내보내기 (Excel/PDF)

**Week 11-12**: 최적화
- 성능 최적화
- 보안 강화
- 사용자 테스트

### Phase 3: 프로덕션 준비 (2-3주)
**Week 13-14**: 완성도
- 고급 리포팅
- 스케줄 리포트
- 알림 시스템

**Week 15**: 배포
- 프로덕션 환경 설정
- 모니터링 설정
- 문서화

---

## 💰 예상 비용

### 무료 티어 (초기)
- Vercel: $0/월
- Supabase: $0/월
- Meta Marketing API: $0
- Kakao Moment API: $0
- Google Ads API: $0

**총계**: **$0/월**

### 스케일업 시 (Pro 플랜)
- Vercel Pro: $20/월
- Supabase Pro: $25/월

**총계**: **$45/월**

---

## 📁 프로젝트 구조

```
medisync/
├── src/
│   ├── app/              # Next.js 14 App Router
│   ├── components/       # React 컴포넌트
│   ├── lib/             # 유틸리티 및 헬퍼
│   ├── types/           # TypeScript 타입
│   ├── hooks/           # 커스텀 훅
│   └── styles/          # 글로벌 스타일
├── supabase/
│   ├── migrations/      # DB 마이그레이션
│   └── functions/       # Edge Functions
├── public/              # 정적 파일
├── docs/                # 프로젝트 문서
└── tests/               # 테스트 파일
```

---

## 🔗 관련 문서

- [데이터베이스 스키마](./DATABASE_SCHEMA.md)
- [API 가이드](./API_GUIDE.md)
- [광고 플랫폼 연동](./AD_PLATFORM_INTEGRATION.md)
- [개발 환경 설정](./DEVELOPMENT_SETUP.md)
- [배포 가이드](./DEPLOYMENT.md)

---

## 📞 지원 및 문의

프로젝트 관련 문의사항은 프로젝트 관리자에게 연락해주세요.

**마지막 업데이트**: 2025-11-12
