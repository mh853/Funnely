# 퍼널리 (Funnely)

**비즈니스 광고 통합 관리 플랫폼** | **프로젝트 진행률: 95%** 🎉

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🎉 최신 업데이트 (2025-11-13)

- **✨ Recharts 고급 차트**: 캠페인 성과를 4가지 차트 (Line, Area, Bar)로 시각화
- **📄 PDF 리포트**: Excel과 PDF 형식 모두 지원
- **👥 팀 관리 시스템**: 팀원 초대, 권한 변경, 삭제 기능
- **🚀 배포 준비 완료**: Vercel 배포 가이드 문서 제공

---

## 📋 개요

퍼널리는 비즈니스의 마케팅 담당자가 **Meta Ads, Kakao Moment, Google Ads**를 한 곳에서 관리하고 분석할 수 있는 통합 SaaS 플랫폼입니다.

### 주요 기능

- ✅ **통합 광고 관리**: Meta, Kakao, Google Ads 통합 관리
- 📊 **실시간 대시보드**: 광고 성과를 한눈에 확인
- 📈 **고급 차트**: Recharts 기반 4가지 차트 (Line, Area, Bar, Dual Axis)
- 📄 **리포트 내보내기**: Excel + PDF 형식 지원
- 👥 **팀 관리**: 팀원 초대, 권한 관리, 5단계 권한 시스템
- 🔔 **실시간 알림**: Supabase Realtime 기반 알림 시스템
- 🔐 **안전한 권한 관리**: 회사별 데이터 격리 및 역할 기반 접근 제어

---

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 18.17 이상
- npm 또는 pnpm
- Supabase 계정

### 설치

```bash
# 1. 저장소 클론
cd ~/funnely

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어서 Supabase 정보 입력

# 4. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

자세한 설정 방법은 [개발 환경 설정 가이드](./docs/DEVELOPMENT_SETUP.md)를 참조하세요.

---

## 🏗️ 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query + Zustand
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

### Backend & Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **API**: Next.js API Routes

### Ad Platforms
- Meta Marketing API v18.0
- Kakao Moment API v2
- Google Ads API v15

---

## 📁 프로젝트 구조

```
funnely/
├── docs/                     # 프로젝트 문서
│   ├── PROJECT_OVERVIEW.md
│   ├── DATABASE_SCHEMA.md
│   ├── AD_PLATFORM_INTEGRATION.md
│   └── DEVELOPMENT_SETUP.md
├── src/
│   ├── app/                  # Next.js 14 App Router
│   ├── components/           # React 컴포넌트
│   ├── lib/                  # 유틸리티 및 헬퍼
│   ├── types/                # TypeScript 타입
│   ├── hooks/                # 커스텀 훅
│   └── styles/               # 글로벌 스타일
├── supabase/
│   └── migrations/           # DB 마이그레이션
├── public/                   # 정적 파일
└── tests/                    # 테스트 파일
```

---

## 📚 문서

- [프로젝트 개요](./docs/PROJECT_OVERVIEW.md) - 프로젝트 전체 개요
- [데이터베이스 스키마](./docs/DATABASE_SCHEMA.md) - DB 구조 및 ERD
- [광고 플랫폼 연동](./docs/AD_PLATFORM_INTEGRATION.md) - API 연동 가이드
- [개발 환경 설정](./docs/DEVELOPMENT_SETUP.md) - 개발 환경 구축

---

## 🔐 보안

퍼널리는 데이터 보안 규정(개인정보보호법)을 준수합니다:

- ✅ End-to-end 암호화
- ✅ Row Level Security (RLS)
- ✅ 역할 기반 접근 제어 (RBAC)
- ✅ 감사 로그 (Audit Trail)
- ✅ API 키 암호화 저장
- ✅ 세션 타임아웃

---

## 🎯 로드맵

### Phase 1: MVP (4-6주) ✅
- [x] 프로젝트 초기화
- [x] DB 스키마 구현
- [ ] 인증 시스템
- [ ] Meta Ads 연동
- [ ] 기본 대시보드

### Phase 2: 확장 (4-6주)
- [ ] Kakao Moment 연동
- [ ] Google Ads 연동
- [ ] 고급 리포팅
- [ ] Excel/PDF 내보내기

### Phase 3: 프로덕션 (2-3주)
- [ ] 성능 최적화
- [ ] 보안 강화
- [ ] 사용자 테스트
- [ ] 배포

---

## 💰 비용

### 무료 티어 (500 사용자까지)
- Vercel: $0/월
- Supabase: $0/월
- Meta API: $0
- Kakao API: $0
- Google Ads API: $0

**총 비용**: **$0/월**

### 스케일업 시
- Vercel Pro: $20/월
- Supabase Pro: $25/월

**총 비용**: **$45/월**

---

## 🤝 기여

프로젝트에 기여하고 싶으시다면:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

---

## 📞 연락처

프로젝트 관련 문의:
- 이메일: support@funnely.co.kr
- 이슈: [GitHub Issues](https://github.com/yourusername/funnely/issues)

---

## 🙏 감사의 말

이 프로젝트는 다음 기술과 서비스를 사용합니다:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Vercel](https://vercel.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**퍼널리** - 광고 관리를 더 쉽고 효율적으로 ✨
