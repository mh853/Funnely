# 데이터베이스 스키마 설계

## 개요

메디씽크 플랫폼의 PostgreSQL 데이터베이스 스키마 설계 문서입니다.
Supabase를 사용하며, Row Level Security (RLS)를 통한 데이터 격리를 구현합니다.

---

## ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│   hospitals     │
│─────────────────│
│ id (PK)         │───┐
│ name            │   │
│ business_number │   │
│ address         │   │
│ phone           │   │
│ settings        │   │
│ created_at      │   │
└─────────────────┘   │
                      │
         ┌────────────┴────────────┬──────────────┐
         │                         │              │
         ▼                         ▼              ▼
┌─────────────────┐      ┌─────────────────┐   ┌─────────────────┐
│     users       │      │  ad_accounts    │   │  audit_logs     │
│─────────────────│      │─────────────────│   │─────────────────│
│ id (PK)         │──┐   │ id (PK)         │   │ id (PK)         │
│ hospital_id (FK)│  │   │ hospital_id (FK)│   │ hospital_id (FK)│
│ email           │  │   │ platform        │   │ user_id (FK)    │
│ full_name       │  │   │ account_id      │   │ action          │
│ role            │  │   │ account_name    │   │ resource_type   │
│ avatar_url      │  │   │ access_token    │   │ resource_id     │
│ created_at      │  │   │ refresh_token   │   │ changes         │
│ last_login      │  │   │ token_expires_at│   │ ip_address      │
└─────────────────┘  │   │ is_active       │   │ user_agent      │
                     │   │ created_by (FK) │   │ created_at      │
                     │   │ created_at      │   └─────────────────┘
                     │   └─────────────────┘
                     │            │
                     │            ▼
                     │   ┌─────────────────┐
                     │   │   campaigns     │
                     │   │─────────────────│
                     │   │ id (PK)         │──┐
                     │   │ ad_account_id(FK)│ │
                     │   │ platform_camp_id│  │
                     │   │ name            │  │
                     │   │ status          │  │
                     │   │ objective       │  │
                     │   │ budget          │  │
                     │   │ budget_type     │  │
                     │   │ start_date      │  │
                     │   │ end_date        │  │
                     │   │ created_by (FK) │──┘
                     │   │ created_at      │
                     │   └─────────────────┘
                     │            │
                     │            ▼
                     │   ┌─────────────────┐
                     │   │campaign_metrics │
                     │   │─────────────────│
                     │   │ id (PK)         │
                     │   │ campaign_id (FK)│
                     │   │ date            │
                     │   │ impressions     │
                     │   │ clicks          │
                     │   │ conversions     │
                     │   │ spend           │
                     │   │ ctr             │
                     │   │ cpc             │
                     │   │ cpa             │
                     │   │ roas            │
                     │   │ reach           │
                     │   │ frequency       │
                     │   │ raw_data        │
                     │   │ synced_at       │
                     │   └─────────────────┘
                     │
                     └──────────────────┐
                                        ▼
                               ┌─────────────────┐
                               │ saved_reports   │
                               │─────────────────│
                               │ id (PK)         │
                               │ hospital_id (FK)│
                               │ created_by (FK) │
                               │ name            │
                               │ description     │
                               │ config          │
                               │ schedule        │
                               │ created_at      │
                               └─────────────────┘
```

---

## 테이블 상세 설계

### 1. hospitals (병원)

병원 조직 정보를 저장하는 최상위 테이블입니다.

```sql
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_number TEXT UNIQUE NOT NULL, -- 사업자등록번호
  address TEXT,
  phone TEXT,
  settings JSONB DEFAULT '{}', -- 병원별 커스텀 설정
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_hospitals_business_number ON hospitals(business_number);

-- RLS 정책
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신이 속한 병원만 조회 가능
CREATE POLICY "Users can view their own hospital"
  ON hospitals FOR SELECT
  USING (
    id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
  );

-- Hospital Owner만 병원 정보 수정 가능
CREATE POLICY "Hospital owners can update their hospital"
  ON hospitals FOR UPDATE
  USING (
    id IN (
      SELECT hospital_id FROM users
      WHERE id = auth.uid() AND role = 'hospital_owner'
    )
  );
```

**컬럼 설명**:
- `id`: 병원 고유 ID (UUID)
- `name`: 병원명
- `business_number`: 사업자등록번호 (유니크)
- `address`: 병원 주소
- `phone`: 대표 전화번호
- `settings`: 병원별 설정 (JSON) - 예: 알림 설정, UI 커스터마이징 등
- `created_at`: 생성 일시
- `updated_at`: 수정 일시

---

### 2. users (사용자)

병원에 소속된 사용자 정보를 저장합니다.

```sql
-- 사용자 역할 Enum
CREATE TYPE user_role AS ENUM (
  'hospital_owner',
  'hospital_admin',
  'marketing_manager',
  'marketing_staff',
  'viewer'
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_users_hospital_id ON users(hospital_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- RLS 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 같은 병원의 사용자만 조회 가능
CREATE POLICY "Users can view users in their hospital"
  ON users FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
  );

-- Admin 이상만 사용자 생성/수정 가능
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin')
    )
  );
```

**컬럼 설명**:
- `id`: 사용자 ID (Supabase Auth의 users 테이블과 연동)
- `hospital_id`: 소속 병원 ID
- `email`: 이메일 주소
- `full_name`: 사용자 이름
- `role`: 사용자 역할
- `avatar_url`: 프로필 이미지 URL
- `is_active`: 활성 상태
- `last_login`: 마지막 로그인 시각

**권한 레벨**:
1. `hospital_owner`: 모든 권한
2. `hospital_admin`: 사용자 관리, 광고 관리
3. `marketing_manager`: 광고 전체 관리
4. `marketing_staff`: 광고 생성/수정
5. `viewer`: 읽기 전용

---

### 3. ad_accounts (광고 계정)

외부 광고 플랫폼 계정 연동 정보를 저장합니다.

```sql
-- 광고 플랫폼 Enum
CREATE TYPE ad_platform AS ENUM (
  'meta',
  'kakao',
  'google'
);

CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  platform ad_platform NOT NULL,
  account_id TEXT NOT NULL, -- 플랫폼의 광고 계정 ID
  account_name TEXT NOT NULL,
  access_token TEXT NOT NULL, -- 암호화 저장 필요
  refresh_token TEXT, -- 암호화 저장 필요
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}', -- 플랫폼별 추가 정보
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 병원에서 같은 플랫폼의 같은 계정은 중복 불가
  UNIQUE(hospital_id, platform, account_id)
);

-- 인덱스
CREATE INDEX idx_ad_accounts_hospital_id ON ad_accounts(hospital_id);
CREATE INDEX idx_ad_accounts_platform ON ad_accounts(platform);
CREATE INDEX idx_ad_accounts_is_active ON ad_accounts(is_active);

-- RLS 정책
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ad accounts in their hospital"
  ON ad_accounts FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
  );

-- Marketing Manager 이상만 광고 계정 관리 가능
CREATE POLICY "Managers can manage ad accounts"
  ON ad_accounts FOR ALL
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager')
    )
  );
```

**컬럼 설명**:
- `id`: 광고 계정 레코드 ID
- `hospital_id`: 소속 병원
- `platform`: 광고 플랫폼 (meta/kakao/google)
- `account_id`: 플랫폼의 광고 계정 ID
- `account_name`: 계정 이름
- `access_token`: OAuth 액세스 토큰 (암호화 필요)
- `refresh_token`: OAuth 리프레시 토큰 (암호화 필요)
- `token_expires_at`: 토큰 만료 시각
- `is_active`: 활성 상태
- `metadata`: 플랫폼별 추가 메타데이터
- `created_by`: 계정 연동한 사용자

---

### 4. campaigns (캠페인)

광고 캠페인 정보를 저장합니다.

```sql
-- 캠페인 상태 Enum
CREATE TYPE campaign_status AS ENUM (
  'active',
  'paused',
  'ended',
  'draft'
);

-- 예산 타입 Enum
CREATE TYPE budget_type AS ENUM (
  'daily',
  'lifetime'
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  platform_campaign_id TEXT NOT NULL, -- 플랫폼의 캠페인 ID
  name TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  objective TEXT, -- 캠페인 목표 (플랫폼별로 다름)
  budget NUMERIC(15, 2), -- 예산
  budget_type budget_type,
  start_date DATE,
  end_date DATE,
  targeting JSONB, -- 타겟팅 설정
  metadata JSONB DEFAULT '{}', -- 플랫폼별 추가 정보
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 광고 계정에서 같은 플랫폼 캠페인 ID는 중복 불가
  UNIQUE(ad_account_id, platform_campaign_id)
);

-- 인덱스
CREATE INDEX idx_campaigns_ad_account_id ON campaigns(ad_account_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);
CREATE INDEX idx_campaigns_end_date ON campaigns(end_date);

-- RLS 정책
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaigns in their hospital"
  ON campaigns FOR SELECT
  USING (
    ad_account_id IN (
      SELECT id FROM ad_accounts
      WHERE hospital_id IN (
        SELECT hospital_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Marketing Staff 이상만 캠페인 관리 가능
CREATE POLICY "Staff can manage campaigns"
  ON campaigns FOR ALL
  USING (
    ad_account_id IN (
      SELECT id FROM ad_accounts
      WHERE hospital_id IN (
        SELECT hospital_id FROM users
        WHERE id = auth.uid()
        AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
      )
    )
  );
```

**컬럼 설명**:
- `id`: 캠페인 레코드 ID
- `ad_account_id`: 소속 광고 계정
- `platform_campaign_id`: 플랫폼의 캠페인 ID
- `name`: 캠페인 이름
- `status`: 캠페인 상태
- `objective`: 캠페인 목표
- `budget`: 예산 금액
- `budget_type`: 예산 타입 (일일/전체)
- `start_date`: 시작일
- `end_date`: 종료일
- `targeting`: 타겟팅 설정 (JSON)
- `metadata`: 플랫폼별 추가 데이터

---

### 5. campaign_metrics (캠페인 성과)

일별 캠페인 성과 데이터를 저장합니다.

```sql
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC(15, 2) DEFAULT 0,
  ctr NUMERIC(5, 2), -- Click-through rate (%)
  cpc NUMERIC(10, 2), -- Cost per click
  cpa NUMERIC(10, 2), -- Cost per acquisition
  roas NUMERIC(10, 2), -- Return on ad spend
  reach BIGINT, -- 도달
  frequency NUMERIC(5, 2), -- 빈도
  raw_data JSONB, -- 플랫폼 원본 데이터
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 캠페인의 같은 날짜는 중복 불가
  UNIQUE(campaign_id, date)
);

-- 인덱스
CREATE INDEX idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(date);
CREATE INDEX idx_campaign_metrics_campaign_date ON campaign_metrics(campaign_id, date DESC);

-- RLS 정책
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics in their hospital"
  ON campaign_metrics FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE aa.hospital_id IN (
        SELECT hospital_id FROM users WHERE id = auth.uid()
      )
    )
  );
```

**컬럼 설명**:
- `id`: 메트릭 레코드 ID
- `campaign_id`: 캠페인 ID
- `date`: 데이터 날짜
- `impressions`: 노출수
- `clicks`: 클릭수
- `conversions`: 전환수
- `spend`: 지출 금액
- `ctr`: 클릭률
- `cpc`: 클릭당 비용
- `cpa`: 전환당 비용
- `roas`: 광고 수익률
- `reach`: 도달 수
- `frequency`: 빈도
- `raw_data`: 플랫폼 원본 데이터 (JSON)
- `synced_at`: 동기화 시각

---

### 6. audit_logs (감사 로그)

모든 중요한 작업을 기록하여 규정 준수 및 보안을 강화합니다.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create_campaign', 'delete_user', 'update_budget' 등
  resource_type TEXT NOT NULL, -- 'campaign', 'user', 'ad_account' 등
  resource_id UUID,
  changes JSONB, -- 변경 내용 (before/after)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_audit_logs_hospital_id ON audit_logs(hospital_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- RLS 정책
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin 이상만 감사 로그 조회 가능
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin')
    )
  );

-- 시스템만 감사 로그 생성 가능 (애플리케이션 레벨에서 처리)
```

**컬럼 설명**:
- `id`: 로그 ID
- `hospital_id`: 병원 ID
- `user_id`: 작업 수행 사용자
- `action`: 작업 종류
- `resource_type`: 리소스 타입
- `resource_id`: 리소스 ID
- `changes`: 변경 내용 (JSON)
- `ip_address`: IP 주소
- `user_agent`: User Agent
- `created_at`: 로그 생성 시각

---

### 7. saved_reports (저장된 리포트)

사용자가 생성한 커스텀 리포트 설정을 저장합니다.

```sql
CREATE TABLE saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- 리포트 설정 (메트릭, 필터, 기간 등)
  schedule JSONB, -- 스케줄 설정 (null이면 일회성)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_saved_reports_hospital_id ON saved_reports(hospital_id);
CREATE INDEX idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_is_active ON saved_reports(is_active);

-- RLS 정책
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports in their hospital"
  ON saved_reports FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
  );

-- 본인이 생성한 리포트만 수정/삭제 가능
CREATE POLICY "Users can manage their own reports"
  ON saved_reports FOR ALL
  USING (
    created_by = auth.uid()
  );
```

**컬럼 설명**:
- `id`: 리포트 ID
- `hospital_id`: 병원 ID
- `created_by`: 생성자 ID
- `name`: 리포트 이름
- `description`: 리포트 설명
- `config`: 리포트 설정 (JSON)
  - 선택한 메트릭
  - 필터 조건
  - 날짜 범위
  - 그룹화 기준 등
- `schedule`: 스케줄 설정 (JSON)
  - 반복 주기 (daily/weekly/monthly)
  - 발송 이메일
  - 다음 실행 시간 등
- `is_active`: 활성 상태

---

## 초기 데이터 (Seeds)

### 테스트 병원 및 사용자

```sql
-- 테스트 병원 생성
INSERT INTO hospitals (id, name, business_number, address, phone) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', '메디씽크 테스트 병원', '123-45-67890', '서울시 강남구 테헤란로 1', '02-1234-5678');

-- 테스트 사용자는 Supabase Auth를 통해 생성 후 users 테이블에 추가
```

---

## 마이그레이션 전략

### 1. 초기 스키마 생성
```bash
# Supabase CLI를 통해 마이그레이션 생성
supabase migration new initial_schema
```

### 2. 버전 관리
- 모든 스키마 변경은 마이그레이션 파일로 관리
- 롤백 가능한 마이그레이션 작성
- 프로덕션 배포 전 스테이징 환경에서 테스트

### 3. 데이터 백업
- 프로덕션 DB는 매일 자동 백업
- 중요 마이그레이션 전 수동 백업 수행

---

## 성능 최적화

### 인덱스 전략
- 자주 조회되는 컬럼에 인덱스 추가
- 복합 인덱스는 쿼리 패턴에 맞게 설계
- 인덱스 사용률 모니터링 및 최적화

### 파티셔닝
- `campaign_metrics` 테이블은 날짜 기준 파티셔닝 고려 (데이터 증가 시)
- `audit_logs` 테이블도 파티셔닝 후보

### 캐싱
- 자주 조회되는 데이터는 Redis/Vercel KV 캐싱
- 광고 성과 데이터는 15분 간격 캐싱

---

## 보안 고려사항

### 1. 암호화
- `access_token`, `refresh_token`은 애플리케이션 레벨에서 암호화
- Supabase Vault 사용 고려

### 2. Row Level Security (RLS)
- 모든 테이블에 RLS 활성화
- 병원별 데이터 격리 보장
- 역할 기반 접근 제어

### 3. 감사 로그
- 모든 중요 작업은 감사 로그에 기록
- 최소 6년 보관 (HIPAA 요구사항)

### 4. 데이터 최소화
- 필요한 데이터만 수집
- 개인정보는 최소화
- 불필요한 데이터는 주기적 삭제

---

## 관련 문서

- [프로젝트 개요](./PROJECT_OVERVIEW.md)
- [API 가이드](./API_GUIDE.md)
- [개발 환경 설정](./DEVELOPMENT_SETUP.md)

**마지막 업데이트**: 2025-11-12
