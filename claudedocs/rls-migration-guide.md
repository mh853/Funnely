# RLS 보안 마이그레이션 실행 가이드

## ⚠️ 중요: Phase 3 진행 전 필수 작업

Supabase에서 15개 테이블의 RLS(Row Level Security) 보안 문제를 해결해야 합니다.

## 📋 마이그레이션 파일

- **파일 위치**: `supabase/migrations/20251217000000_enable_rls_security.sql`
- **목적**: 15개 테이블의 RLS 활성화 및 정책 생성

## 🚀 실행 방법

### Option 1: Supabase Dashboard (권장)

1. **Supabase SQL Editor 열기**:
   ```
   https://supabase.com/dashboard/project/gprrqdhmnzsimkzdhfhh/sql/new
   ```

2. **마이그레이션 파일 복사**:
   ```bash
   cat supabase/migrations/20251217000000_enable_rls_security.sql
   ```
   전체 내용을 복사하세요.

3. **SQL Editor에 붙여넣기 및 실행**:
   - SQL Editor에 전체 내용 붙여넣기
   - "Run" 버튼 클릭
   - 결과 확인

4. **성공 메시지 확인**:
   ```
   ✅ RLS Security Migration Completed
   📊 RLS enabled on 15 out of 15 tables
   🎉 All security vulnerabilities resolved!
   ```

### Option 2: 로컬 터미널 (psql 설치 필요)

```bash
PGPASSWORD='Audtjr1357!' psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -d postgres \
  -f supabase/migrations/20251217000000_enable_rls_security.sql
```

## ✅ 검증 방법

마이그레이션 실행 후, Supabase Dashboard에서 확인:

1. **Table Editor → 각 테이블 → "RLS" 탭**
2. 다음 테이블들의 RLS 상태가 "Enabled"인지 확인:
   - ✅ users
   - ✅ admin_roles
   - ✅ admin_role_assignments
   - ✅ privacy_requests
   - ✅ announcements
   - ✅ in_app_messages
   - ✅ email_templates
   - ✅ automation_workflows
   - ✅ bulk_operations
   - ✅ customer_health_scores
   - ✅ onboarding_progress
   - ✅ feature_usage_tracking
   - ✅ revenue_metrics
   - ✅ churn_records

## 📊 마이그레이션 내용

### 1. RLS 활성화 (15개 테이블)
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
-- ... 총 15개 테이블
```

### 2. 정책 생성

#### Super Admin 전용 (admin_roles, admin_role_assignments)
```sql
CREATE POLICY "Super admins can manage admin roles"
  ON public.admin_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments ara
      JOIN public.admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid() AND ar.code = 'super_admin'
    )
  );
```

#### Finance 역할 (revenue_metrics, churn_records)
```sql
CREATE POLICY "Finance and admins can view revenue"
  ON public.revenue_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments ara
      JOIN public.admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid()
      AND ar.code IN ('super_admin', 'finance', 'analyst')
    )
  );
```

#### 일반 Admin (customer_health_scores, onboarding_progress, feature_usage_tracking)
```sql
CREATE POLICY "Admins can view customer health scores"
  ON public.customer_health_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );
```

## 🔍 문제 해결

### 실행 오류 발생 시

1. **권한 오류**:
   - Supabase Dashboard에 프로젝트 소유자 계정으로 로그인했는지 확인
   - Service Role Key가 올바른지 확인

2. **정책 충돌**:
   - 기존 정책이 있다면 먼저 삭제 후 재실행
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON public.table_name;
   ```

3. **테이블 없음**:
   - 해당 테이블이 실제로 존재하는지 확인
   - 이전 마이그레이션이 모두 실행되었는지 확인

## 📝 다음 단계

RLS 마이그레이션 완료 후:

1. ✅ 보안 검증 완료
2. 🚀 Phase 3.1 시작: MRR/ARR 수익 지표 계산
3. 📊 Phase 3.2: 수익 대시보드 구현
4. 📉 Phase 3.3: 이탈 분석 시스템
5. 💡 Phase 3.4: 성장 기회 식별

## ⚠️ 주의사항

- 프로덕션 환경에서 실행하므로 신중하게 진행
- 마이그레이션 전 데이터 백업 권장
- RLS 활성화 후 기존 관리자 계정의 접근 권한 확인
- 정책 생성 후 각 역할별 접근 테스트 필요
