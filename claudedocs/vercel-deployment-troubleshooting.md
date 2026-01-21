# Vercel 배포 문제 분석 및 해결 가이드

## 📋 문제 상황

### 증상
- Git push 성공 후에도 Vercel에서 자동 배포가 트리거되지 않음
- Vercel Deployments 페이지에서 최신 커밋들이 보이지 않음
- 마지막으로 배포된 커밋: `d0e9719` (2025-01-09)
- 배포되지 않은 커밋들: `26e4130`, `9355c07`, `ce311c0`, `3f94da0`

### 확인된 사항
✅ **Git 상태**: 정상
- 로컬 main 브랜치 HEAD: `3f94da0`
- 원격 origin/main HEAD: `3f94da0`
- 모든 커밋이 GitHub에 성공적으로 push됨

✅ **빌드 상태**: 정상
- `npm run build` 성공적으로 완료
- TypeScript 컴파일 오류 없음 (모두 수정됨)
- ESLint 경고만 존재 (배포 차단하지 않음)

✅ **Vercel 프로젝트 설정**: 정상
- Project ID: `prj_cYCVGDv9J5DyOPHm822Gax6TS6wu`
- Organization: `team_WHxOqEyW8LqXOeduWTdNMxp8`
- Project Name: `medisync`

---

## 🔍 가능한 원인 분석

### 1. GitHub Webhook 문제 (가장 가능성 높음)
**증상**: Vercel이 GitHub push 이벤트를 받지 못함

**원인**:
- GitHub → Vercel webhook이 비활성화되었거나 실패
- Webhook delivery가 실패하고 있을 수 있음
- Vercel Git integration 재연결 과정에서 webhook이 제대로 생성되지 않음

**확인 방법**:
1. GitHub 저장소 → Settings → Webhooks
2. Vercel webhook 확인 (URL: `https://api.vercel.com/...`)
3. Recent Deliveries 탭에서 실패한 요청 확인

### 2. Vercel 프로젝트 설정 문제
**원인**:
- Git branch가 잘못 설정됨 (main이 아닌 다른 브랜치)
- Production branch 설정이 변경됨
- Ignored Build Step 설정이 활성화됨

**확인 방법**:
1. Vercel Dashboard → Project Settings → Git
2. Production Branch가 `main`인지 확인
3. Ignored Build Step이 비어있는지 확인

### 3. Vercel 배포 규칙 (Deployment Protection)
**원인**:
- Deploy Hooks가 비활성화됨
- Protection Bypass for Automation이 필요
- Preview deployments만 허용되도록 설정됨

**확인 방법**:
1. Vercel Dashboard → Project Settings → Git
2. Automatic Deployments 설정 확인

### 4. Vercel 계정/팀 권한 문제
**원인**:
- Team plan quota 초과
- Deployment limit 도달
- 결제 문제로 인한 제한

**확인 방법**:
1. Vercel Dashboard → Team Settings → Usage
2. 배포 횟수 및 quota 확인

---

## 🛠️ 해결 방법

### 방법 1: GitHub Webhook 재설정 (추천)

#### 1-1. Webhook 상태 확인
```
1. GitHub 저장소로 이동
2. Settings → Webhooks
3. Vercel webhook 찾기 (https://api.vercel.com/...)
4. Recent Deliveries 클릭하여 실패 내역 확인
```

#### 1-2. Webhook 재생성
**Option A: Vercel에서 재연결**
```
1. Vercel Dashboard → Project Settings → Git
2. "Disconnect" 클릭
3. "Connect Git Repository" 클릭
4. GitHub 저장소 재선택
```

**Option B: GitHub에서 Webhook 삭제 후 재생성**
```
1. GitHub → Settings → Webhooks
2. Vercel webhook 삭제
3. Vercel Dashboard에서 Git 재연결
```

### 방법 2: 수동 배포 트리거

#### 2-1. Vercel CLI 사용
```bash
# Vercel CLI 설치 (없는 경우)
npm i -g vercel

# 로그인
vercel login

# 프로젝트 링크 (최초 1회)
vercel link

# 배포
vercel --prod
```

#### 2-2. Vercel Dashboard에서 수동 배포
```
1. Vercel Dashboard → Deployments
2. 우측 상단 "Deploy" 버튼 클릭
3. Branch 선택: main
4. "Deploy" 클릭
```

### 방법 3: 빈 커밋으로 트리거 (이미 시도함 - 실패)
```bash
# 이미 시도했으나 작동하지 않음
git commit --allow-empty -m "chore: trigger deployment"
git push origin main
```

### 방법 4: Vercel 프로젝트 재설정 (최후의 수단)

**주의**: 이 방법은 기존 배포 히스토리와 설정을 잃을 수 있습니다.

```
1. Vercel Dashboard → Project Settings → General
2. 페이지 하단 "Delete Project" (삭제하지 말고 Git만 연결 해제)
3. "Git" 탭에서 "Disconnect" 클릭
4. 새로 "Connect Git Repository" 클릭
5. GitHub 저장소 재연결
```

---

## ✅ 권장 해결 순서

### Step 1: GitHub Webhook 확인 (5분)
```
1. GitHub 저장소 → Settings → Webhooks
2. Vercel webhook 상태 확인
3. Recent Deliveries에서 실패 로그 확인
```

**결과가 실패면** → Webhook 재생성 (방법 1-2)

### Step 2: Vercel 설정 확인 (5분)
```
1. Vercel Dashboard → Project Settings → Git
2. Production Branch = "main" 확인
3. Automatic Deployments = Enabled 확인
4. Ignored Build Step = 비어있음 확인
```

**설정이 잘못되었으면** → 올바른 값으로 변경

### Step 3: 수동 배포로 긴급 대응 (10분)
```bash
# Vercel CLI로 즉시 배포
vercel --prod
```

**배포 성공하면** → 환경 변수 확인 및 Cron 작동 테스트

### Step 4: Git 연결 재설정 (15분)
만약 위 방법들이 실패하면:
```
1. Vercel에서 Git Disconnect
2. GitHub Webhook 삭제
3. Vercel에서 Git 재연결
4. 새 커밋으로 자동 배포 테스트
```

---

## 🔧 배포 후 필수 확인 사항

### 1. 환경 변수 확인
```
Vercel Dashboard → Project Settings → Environment Variables

필수 환경 변수:
✓ RESEND_API_KEY
✓ CRON_SECRET
✓ NEXT_PUBLIC_DOMAIN
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
```

### 2. Cron Jobs 확인
```
Vercel Dashboard → Cron

예상되는 Cron Jobs:
- /api/cron/daily-tasks (0 1 * * *)
- /api/cron/lead-digest (0 23,7 * * *)
```

### 3. 배포 로그 확인
```
Vercel Dashboard → Deployments → [최신 배포] → Build Logs

확인 사항:
✓ Build successful
✓ No TypeScript errors
✓ All environment variables loaded
```

### 4. 프로덕션 테스트
```
1. https://funnely.co.kr 접속
2. 랜딩페이지에서 상담 신청 테스트
3. Dashboard에서 리드 등록 확인
4. 이메일 알림 수신 대기 (오전 8시, 오후 4시)
```

---

## 📊 모니터링

### GitHub Webhook 모니터링
```
정기적으로 확인:
- GitHub → Settings → Webhooks → Recent Deliveries
- 모든 delivery가 200 OK 응답을 받는지 확인
```

### Vercel 배포 모니터링
```
배포 실패 시 알림 설정:
1. Vercel Dashboard → Project Settings → Notifications
2. Deployment Failed 알림 활성화
3. 이메일 또는 Slack 연동
```

---

## 📝 체크리스트

**즉시 확인**:
- [ ] GitHub Webhook 상태 확인
- [ ] Vercel Git 설정 확인 (Production Branch = main)
- [ ] Vercel Automatic Deployments 활성화 확인

**긴급 대응**:
- [ ] Vercel CLI로 수동 배포 (`vercel --prod`)
- [ ] 배포 성공 확인
- [ ] 환경 변수 모두 설정됨 확인
- [ ] Cron Jobs 등록 확인

**근본 원인 해결**:
- [ ] GitHub Webhook 재생성 (필요시)
- [ ] Vercel Git 재연결 (필요시)
- [ ] 새 커밋으로 자동 배포 테스트

---

**문서 작성일**: 2025-01-21
**최종 업데이트**: 2025-01-21
**작성자**: Claude Code
**관련 이슈**: Vercel 자동 배포 중단 (커밋 26e4130부터)
