# Vercel Git 완전 재연결 가이드

## 문제 상황
- Vercel과 GitHub 재연결 후에도 GitHub Webhooks가 생성되지 않음
- 자동 배포가 작동하지 않음

## 완전 재연결 프로세스

### Step 1: GitHub에서 Vercel App 권한 확인

1. **GitHub Apps 설정 페이지**
   ```
   https://github.com/settings/installations
   ```

2. **Vercel 앱 권한 확인**
   - "Installed GitHub Apps" 섹션에서 "Vercel" 찾기
   - "Configure" 버튼 클릭

3. **Repository Access 확인**
   - "All repositories" 선택 OR
   - "Only select repositories" → `mh853/Funnely` 체크
   - "Save" 클릭

### Step 2: Vercel 프로젝트 완전 삭제 후 재생성 (가장 확실한 방법)

⚠️ **주의**: 이 방법은 배포 히스토리를 잃지만, Git 연결 문제를 완전히 해결합니다.

#### 2-1. 환경 변수 백업

**현재 Vercel 환경 변수 복사** (삭제 전에 반드시):
```
Vercel Dashboard → medisync → Settings → Environment Variables

필수 환경 변수:
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ RESEND_API_KEY
✓ CRON_SECRET
✓ NEXT_PUBLIC_DOMAIN
✓ NEXT_PUBLIC_APP_NAME
```

**메모장에 복사해두세요!**

#### 2-2. 프로젝트 삭제

1. **Vercel Dashboard**
   ```
   https://vercel.com/dashboard
   ```

2. **medisync 프로젝트 선택**

3. **Settings → General**
   - 페이지 맨 아래로 스크롤
   - "Delete Project" 섹션
   - 프로젝트 이름 입력하여 확인
   - "Delete" 클릭

#### 2-3. 새 프로젝트 생성

1. **Vercel Dashboard 메인**
   - "Add New..." → "Project" 클릭

2. **Import Git Repository**
   - "Import Git Repository" 선택
   - GitHub 선택
   - `mh853/Funnely` (또는 MediSync) 선택
   - "Import" 클릭

3. **프로젝트 설정**
   - Project Name: `medisync` (또는 원하는 이름)
   - Framework Preset: Next.js (자동 감지됨)
   - Root Directory: `./` (기본값)
   - Build Command: `npm run build` (기본값)
   - Output Directory: `.next` (기본값)
   - Install Command: `npm install` (기본값)

4. **환경 변수 입력**
   - "Environment Variables" 섹션 확장
   - 백업한 환경 변수들 모두 입력:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   RESEND_API_KEY=re_your_api_key
   CRON_SECRET=BypTwrdYjYZHpPX3+jJ0zPYJ0lKMWZ29+skGYqaXRm4=
   NEXT_PUBLIC_DOMAIN=https://funnely.co.kr
   NEXT_PUBLIC_APP_NAME=Funnely
   ```

5. **Deploy 클릭**
   - 첫 배포가 자동으로 시작됨
   - 빌드 로그 확인

#### 2-4. Webhook 자동 생성 확인

**배포 완료 후**:
1. GitHub → Settings → Webhooks 확인
2. Vercel webhook이 생성되었는지 확인:
   ```
   Payload URL: https://api.vercel.com/v1/integrations/deploy/...
   Content type: application/json
   Events: push, pull_request 등
   ```

### Step 3: 대안 방법 - Vercel CLI로 재연결 (프로젝트 유지)

프로젝트를 삭제하고 싶지 않다면:

#### 3-1. Vercel CLI 설치 및 재연결

```bash
# Vercel CLI 설치
npm i -g vercel

# 기존 연결 제거
rm -rf .vercel

# 재연결
vercel link

# 선택 과정:
# - Scope: 팀 선택
# - Link to existing project? Yes
# - Project name: medisync
```

#### 3-2. 수동 배포로 테스트

```bash
# 프로덕션 배포
vercel --prod
```

#### 3-3. Webhook 확인

배포 후 GitHub Webhooks 페이지에서 webhook 생성 확인

### Step 4: 도메인 재설정 (프로젝트 재생성 시)

새 프로젝트 생성한 경우:

1. **Vercel Dashboard → Settings → Domains**

2. **기존 도메인 제거 (있다면)**
   - `funnely.co.kr` 옆 "Remove" 클릭

3. **도메인 추가**
   - "funnely.co.kr" 입력
   - "Add" 클릭
   - DNS 설정 확인 (이미 설정되어 있음)

### Step 5: Cron Jobs 확인

1. **Vercel Dashboard → Cron**

2. **Cron Jobs 자동 감지 확인**
   ```
   /api/cron/daily-tasks (0 1 * * *)
   /api/cron/lead-digest (0 23,7 * * *)
   ```

3. **감지 안 되면**
   - `vercel.json` 파일 확인
   - 다시 배포

---

## 권장 순서

### 빠른 해결 (10분)
```
1. Vercel CLI로 수동 배포 (Step 3-2)
   → 최신 코드 즉시 배포

2. GitHub Webhooks 확인
   → 여전히 비어있으면 다음 단계
```

### 완전한 해결 (30분)
```
1. 환경 변수 백업 (Step 2-1)
2. 프로젝트 삭제 (Step 2-2)
3. 새 프로젝트 생성 (Step 2-3)
4. Webhook 자동 생성 확인 (Step 2-4)
5. 도메인 재설정 (Step 4)
6. Cron 확인 (Step 5)
```

---

## 검증 방법

### 1. Webhook 생성 확인
```
GitHub → Settings → Webhooks

예상 결과:
✓ Vercel webhook 존재
✓ Recent Deliveries에 ping 이벤트
✓ 초록색 체크마크
```

### 2. 자동 배포 테스트
```bash
# 테스트 커밋
git commit --allow-empty -m "test: webhook test"
git push origin main

# 결과 확인:
# Vercel Dashboard → Deployments
# 새 배포가 자동으로 트리거됨
```

### 3. 환경 변수 확인
```
Vercel Dashboard → Settings → Environment Variables

모든 변수 존재 확인:
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ RESEND_API_KEY
✓ CRON_SECRET
✓ NEXT_PUBLIC_DOMAIN
```

### 4. Cron Jobs 확인
```
Vercel Dashboard → Cron

예상 결과:
✓ /api/cron/daily-tasks (0 1 * * *)
✓ /api/cron/lead-digest (0 23,7 * * *)
```

---

## 트러블슈팅

### 문제: Webhook이 여전히 생성되지 않음

**원인**: GitHub App 권한 문제

**해결**:
1. GitHub → Settings → Applications → Installed GitHub Apps
2. Vercel → Configure
3. Repository access → "All repositories" 선택
4. Save

### 문제: 환경 변수가 배포에 적용되지 않음

**원인**: 환경 변수 설정 후 재배포 필요

**해결**:
```bash
vercel --prod --force
```

### 문제: Cron Jobs가 표시되지 않음

**원인**: vercel.json이 배포에 포함되지 않음

**해결**:
1. `vercel.json` 파일 확인
2. Git에 커밋되어 있는지 확인
3. 재배포

---

**문서 작성일**: 2025-01-21
**최종 업데이트**: 2025-01-21
**작성자**: Claude Code
