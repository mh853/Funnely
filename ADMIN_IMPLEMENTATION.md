# 퍼널리 어드민 시스템 구현 추적 문서

프로젝트 진행 상황을 추적하고 전체 방향성을 유지하기 위한 문서입니다.

---

## 📌 프로젝트 개요

**목표**: 퍼널리 슈퍼 어드민 시스템 구축 - 모든 회사의 가입 정보, 결제 현황, 활동 로그, 문의사항을 통합 관리

**전체 타임라인**: 약 10-12주 (모든 Phase 포함)

**현재 Phase**: Phase 1 완료 ✅ / Phase 2 완료 ✅ / Phase 3 (회사 관리) 준비 중

---

## ✅ 구현 진행 상황

### **Phase 1: 기초 인프라 구축** (1-2주)
**목표**: 데이터베이스 스키마, 권한 시스템, 미들웨어 보호

#### 1.1 데이터베이스 마이그레이션
- [x] `20251213000000_add_super_admin_role.sql` - 슈퍼 어드민 역할 추가
- [x] `20251213000001_create_activity_logs.sql` - 활동 로그 테이블
- [x] `20251213000002_create_support_tickets.sql` - 문의 관리 테이블
- [x] `20251213000003_create_admin_stats_view.sql` - 통계 뷰
- [x] `20251213000004_add_admin_rls_policies.sql` - RLS 정책

**작업 내용**:
```
✅ 완료: supabase/migrations/ 디렉토리에 5개 마이그레이션 파일 생성
- users 테이블에 is_super_admin BOOLEAN 컬럼 추가 (인덱스 포함)
- company_activity_logs 테이블 생성 (활동 추적, 3개 인덱스)
- support_tickets, support_ticket_messages, support_ticket_status_history 테이블 생성
- admin_company_stats materialized view 생성 (통계 집계)
- RLS 정책으로 슈퍼 어드민만 전체 데이터 접근 가능하도록 설정
- 일반 사용자는 자기 회사 데이터만 접근 가능

⚠️ 주의: 프로덕션 DB에 직접 적용 필요 (Supabase Dashboard SQL Editor 사용)
```

#### 1.2 미들웨어 및 권한 시스템
- [x] `src/lib/admin/permissions.ts` - 권한 검증 유틸
- [x] `src/lib/admin/activity-logger.ts` - 활동 로깅 유틸 (보너스)
- [x] `src/middleware.ts` 업데이트 - `/admin/*` 경로 보호

**작업 내용**:
```
✅ 완료: 권한 시스템 및 미들웨어 구현
- permissions.ts: isSuperAdmin(), requireSuperAdmin(), getSuperAdminUser() 함수
- middleware.ts: /admin 경로 접근 시 is_super_admin 자동 검증
- 권한 없으면 /dashboard로 자동 리다이렉트
- activity-logger.ts: 회사 활동 로깅 유틸 (logActivity, logUserLogin, logLeadCreated 등)
```

---

### **Phase 2: 어드민 대시보드** (2-3주)
**목표**: 어드민 전용 레이아웃 및 통계 대시보드

#### 2.1 레이아웃 및 네비게이션
- [x] `src/app/admin/layout.tsx` - 어드민 레이아웃
- [x] `src/app/admin/components/AdminNav.tsx` - 네비게이션
- [x] `src/app/admin/page.tsx` - 대시보드 메인

#### 2.2 대시보드 통계
- [x] `/admin/api/stats/route.ts` API 엔드포인트
- [x] `StatsCard.tsx`, `RecentCompanies.tsx`, `SystemAlerts.tsx`, `ActivityFeed.tsx` 컴포넌트
- [x] 실시간 데이터 갱신 (60초마다 자동 갱신)

**작업 내용**:
```
✅ 완료: 어드민 대시보드 UI 및 API 구현
- 어드민 전용 레이아웃 (사이드바 + 헤더)
- 5개 메뉴 (대시보드, 회사관리, 문의관리, 분석, 설정)
- 통계 API (/admin/api/stats) - materialized view 활용
- 4개 통계 카드 (총 회사, 활성 회사, 총 사용자, 신규 리드)
- 최근 가입 회사 목록 (5개)
- 시스템 알림 (긴급 문의 등)
- 최근 활동 피드 (10개)
- 60초마다 자동 갱신
```

---

### **Phase 3: 회사 관리** (2-3주)
**목표**: 회사 목록, 검색, 상세 정보 관리

#### 3.1 회사 목록 및 검색
- [ ] `src/app/admin/companies/page.tsx`
- [ ] `/api/admin/companies` API
- [ ] 필터, 검색, 페이지네이션

#### 3.2 회사 상세 정보
- [ ] `src/app/admin/companies/[id]/page.tsx`
- [ ] 탭: 개요, 사용자, 활동, 구독

**작업 내용**:
```
- 대기 중
```

---

### **Phase 4: 문의 관리 시스템** (2-3주)
**목표**: 문의 목록, 상세, 응답 시스템

#### 4.1 문의 목록 및 필터
- [ ] `src/app/admin/support/page.tsx`
- [ ] Kanban 보드 / 테이블 뷰
- [ ] 필터 (상태, 우선순위, 카테고리)

#### 4.2 문의 상세 및 응답
- [ ] `src/app/admin/support/[id]/page.tsx`
- [ ] 메시지 스레드, 응답 폼, 사이드바

#### 4.3 일반 사용자 문의 생성
- [ ] `src/app/dashboard/support/page.tsx`
- [ ] 문의 생성 폼, 문의 목록

**작업 내용**:
```
- 대기 중
```

---

### **Phase 5: 활동 로깅 및 분석** (1-2주)
**목표**: 활동 로그 수집 및 분석 대시보드

#### 5.1 활동 로그 수집
- [ ] `src/lib/admin/activity-logger.ts`
- [ ] 주요 이벤트 트래킹 추가

#### 5.2 분석 대시보드
- [ ] `src/app/admin/analytics/*`
- [ ] 매출, 사용량, 성장 지표 차트

**작업 내용**:
```
- 대기 중
```

---

### **Phase 6: 결제 및 구독 관리** (선택적, 3주)
**목표**: 결제 내역, 구독 관리 (외부 시스템 연동)

- [ ] Stripe/Toss 웹훅 수신
- [ ] 결제 내역 조회
- [ ] 구독 플랜 변경

**작업 내용**:
```
- 대기 중
```

---

## 📊 전체 진행률

```
Phase 1: ██████████ 100% ✅ (완료)
Phase 2: ██████████ 100% ✅ (완료)
Phase 3: ░░░░░░░░░░ 0%   (준비 중)
Phase 4: ░░░░░░░░░░ 0%   (대기)
Phase 5: ░░░░░░░░░░ 0%   (대기)
Phase 6: ░░░░░░░░░░ 0%   (대기)

전체: ███░░░░░░░ 33%
```

---

## 🎯 다음 작업

**현재 작업**: Phase 3 - 회사 관리 시스템

**순서**:
1. ✅ Phase 1 완료 (DB 마이그레이션, 권한 시스템, 미들웨어)
2. ✅ Phase 2 완료 (어드민 레이아웃, 대시보드, 통계 API)
3. 🔜 회사 목록 페이지 (/admin/companies)
4. 회사 상세 페이지 (/admin/companies/[id])
5. 회사 관리 API

---

## 📝 중요 결정사항

### 아키텍처 결정
- ✅ 기존 시스템 확장 방식 채택 (`/admin/*` 경로 추가)
- ✅ Supabase RLS로 데이터 접근 제어
- ✅ Materialized View로 통계 성능 최적화

### 기술 스택
- ✅ Next.js 14 (App Router)
- ✅ Supabase (PostgreSQL + RLS)
- ✅ TypeScript
- 예정: React Query/SWR (데이터 캐싱)
- 예정: Recharts (차트)

### 보안 정책
- ✅ `is_super_admin` 플래그로 권한 관리
- ✅ 미들웨어로 `/admin/*` 경로 보호
- ✅ RLS로 데이터베이스 레벨 보안

---

## 🐛 이슈 트래킹

### 해결된 이슈
- 없음 (아직 구현 시작 안함)

### 진행 중 이슈
- 없음

### 예상 이슈
- [ ] pg_cron 사용 가능 여부 확인 필요 (통계 뷰 자동 갱신)
- [ ] 슈퍼 어드민 초기 계정 생성 방법 결정

---

## 📅 마일스톤

- [ ] **Week 2**: Phase 1 완료 (인프라 구축)
- [ ] **Week 5**: Phase 2 완료 (대시보드)
- [ ] **Week 8**: Phase 3 완료 (회사 관리)
- [ ] **Week 11**: Phase 4 완료 (문의 관리) - **MVP 완성**
- [ ] **Week 13**: Phase 5 완료 (분석)
- [ ] **Week 16**: Phase 6 완료 (결제 관리) - **전체 완성**

---

## 📖 참고 문서

- [전체 설계 문서](./docs/admin-system-design.md) (별도 생성 예정)
- [API 명세서](./docs/admin-api-spec.md) (별도 생성 예정)
