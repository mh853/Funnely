# Vercel 배포 중단 근본 원인 분석

## 🔍 타임라인 분석

### 배포 성공 (2025-01-09)
- **커밋**: `d0e9719` - "fix: 카카오 픽셀 race condition 오류 수정"
- **상태**: ✅ 정상 배포 완료
- **vercel.json**:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/daily-tasks",
        "schedule": "0 1 * * *"
      }
    ]
  }
  ```

### 배포 실패 시작 (2025-01-10 이후)
- **커밋**: `26e4130` - "feat: 리드 생성 시 실시간 이메일 알림 발송 추가"
- **변경 사항**:
  1. `resend` 패키지 사용 시작
  2. `RESEND_API_KEY` 환경 변수 필요
  3. 이메일 발송 기능 추가

- **후속 커밋**: `9355c07` - "feat: 하루 2회 리드 다이제스트 이메일 시스템 구현"
- **변경 사항**:
  1. 새로운 cron job 추가 (`/api/cron/lead-digest`)
  2. `vercel.json` 수정
  3. `CRON_SECRET` 환경 변수 필요

## 🎯 근본 원인 (Root Cause)

### 가설 1: GitHub Webhook 미생성 ⭐ (가장 가능성 높음)
**증거**:
- GitHub → Settings → Webhooks 페이지가 비어있음
- Vercel Git 재연결 후에도 webhook이 생성되지 않음
- `d0e9719` 이후 모든 커밋이 Vercel에 전달되지 않음

**원인**:
- Vercel Git integration 재연결 과정에서 webhook 생성 실패
- GitHub App 권한 문제로 webhook 생성 불가능
- Vercel과 GitHub 간 연결 상태가 불완전함

**영향**:
- GitHub push 이벤트가 Vercel에 전달되지 않음
- 자동 배포 트리거가 작동하지 않음
- 코드 변경사항이 배포되지 않음

### 가설 2: Vercel 프로젝트 설정 문제 (가능성 중간)
**증거**:
- Vercel Dashboard에서 최신 커밋이 보이지 않음
- 배포 목록이 `d0e9719`에서 멈춤

**가능한 원인**:
- Production Branch 설정이 변경됨 (main이 아닌 다른 브랜치)
- Automatic Deployments가 비활성화됨
- Ignored Build Step 규칙이 활성화됨

### 가설 3: 환경 변수 누락으로 인한 빌드 실패 (가능성 낮음)
**증거**:
- 로컬 빌드는 성공 (`npm run build` ✅)
- `RESEND_API_KEY`, `CRON_SECRET` 환경 변수 필요

**반박**:
- 환경 변수 누락은 빌드 성공 후 런타임 오류를 발생시킴
- 배포 자체가 트리거되지 않는 현상과는 무관

## 💡 해결 전략

### 전략 A: GitHub Webhook 재생성 (우선순위 1)

#### A-1. GitHub App 권한 확인
```
1. https://github.com/settings/installations
2. Vercel 앱 찾기 → Configure
3. Repository access 확인
   - "All repositories" 선택 OR
   - "Only select repositories" → mh853/Funnely 체크
4. Save
```

#### A-2. Vercel CLI로 즉시 배포 (긴급)
```bash
# 최신 코드 즉시 배포
npm i -g vercel
vercel login
vercel --prod

# 결과:
# - 최신 커밋 3f94da0 배포
# - 환경 변수 적용
# - Cron job 활성화
```

#### A-3. Webhook 수동 생성 확인
배포 후:
```
1. GitHub → Settings → Webhooks
2. Vercel webhook 생성 확인
   - Payload URL: https://api.vercel.com/v1/integrations/deploy/...
   - Events: push, pull_request
```

만약 webhook이 여전히 없다면 → **전략 B**

### 전략 B: Vercel 프로젝트 재생성 (우선순위 2)

#### B-1. 환경 변수 백업
```
Vercel Dashboard → medisync → Settings → Environment Variables

복사할 변수:
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ RESEND_API_KEY
✓ CRON_SECRET
✓ NEXT_PUBLIC_DOMAIN
✓ NEXT_PUBLIC_APP_NAME
```

#### B-2. 프로젝트 삭제
```
Vercel Dashboard → medisync → Settings → General
→ 하단 "Delete Project" → 확인
```

#### B-3. 새 프로젝트 생성
```
Vercel Dashboard → "Add New..." → "Project"
→ Import Git Repository
→ mh853/Funnely 선택
→ 환경 변수 모두 입력
→ Deploy
```

#### B-4. Webhook 자동 생성 확인
```
GitHub → Settings → Webhooks
→ Vercel webhook 생성됨 확인
```

### 전략 C: Vercel 설정 확인 (전략 A, B 실패 시)

```
Vercel Dashboard → medisync → Settings → Git

확인 사항:
✓ Production Branch = "main"
✓ Automatic Deployments = Enabled
✓ Ignored Build Step = (비어있음)
```

## 📊 전략 비교

| 전략 | 소요 시간 | 성공 가능성 | 부작용 | 권장도 |
|-----|---------|-----------|--------|--------|
| A-2. Vercel CLI | 5분 | 100% | Webhook 문제 미해결 | ⭐⭐⭐⭐⭐ (긴급 배포) |
| A-1. GitHub 권한 | 5분 | 70% | 없음 | ⭐⭐⭐⭐ (시도 필수) |
| A-3. Webhook 확인 | 2분 | 검증용 | 없음 | ⭐⭐⭐ (확인용) |
| B. 프로젝트 재생성 | 30분 | 95% | 배포 히스토리 손실 | ⭐⭐⭐⭐ (근본 해결) |
| C. 설정 확인 | 10분 | 50% | 없음 | ⭐⭐ (마지막 수단) |

## 🎯 권장 실행 순서

### Phase 1: 긴급 배포 (5분)
```bash
# 최신 코드 즉시 배포
vercel --prod
```
**목표**: 프로덕션에 최신 코드 반영

### Phase 2: 근본 원인 해결 (15분)
```
1. GitHub App 권한 확인 및 수정
2. Vercel CLI 배포 후 webhook 생성 확인
3. 생성 안 되었으면 → Vercel 프로젝트 재생성
```
**목표**: 자동 배포 복구

### Phase 3: 검증 (5분)
```bash
# 테스트 커밋으로 자동 배포 확인
git commit --allow-empty -m "test: verify auto-deployment"
git push origin main

# Vercel Dashboard → Deployments
# → 새 배포가 자동으로 트리거되는지 확인
```
**목표**: 자동 배포 작동 확인

## 🔧 Resend 관련 고려사항

### Resend와의 관계
**Resend 자체는 배포 중단의 직접적 원인이 아님**:
- ✅ 로컬 빌드 성공 (Resend 패키지 문제 없음)
- ✅ TypeScript 컴파일 성공 (타입 오류 없음)
- ⚠️ 환경 변수 누락은 런타임 오류만 발생 (배포는 진행됨)

### 타이밍 일치의 의미
Resend 추가 시점과 배포 중단 시점이 일치하는 이유:
1. **Resend 추가** → Git commit → Git push
2. **Git push** → GitHub webhook 호출 (하지만 webhook이 없음!)
3. **Vercel이 이벤트를 받지 못함** → 배포 트리거 안 됨

즉, Resend가 문제가 아니라 **webhook이 없어서 Git push 자체가 Vercel에 전달되지 않음**

## ✅ 성공 기준

### 즉시 확인 (Phase 1 후)
- [ ] `vercel --prod` 성공
- [ ] Vercel Dashboard에서 최신 커밋 확인
- [ ] 프로덕션 사이트에서 최신 기능 작동 확인

### 근본 해결 확인 (Phase 2 후)
- [ ] GitHub Webhooks 페이지에 Vercel webhook 존재
- [ ] Recent Deliveries에 200 OK 응답 확인
- [ ] 테스트 커밋 후 자동 배포 트리거 확인

### 최종 검증 (Phase 3 후)
- [ ] 자동 배포 정상 작동
- [ ] 환경 변수 모두 적용됨
- [ ] Cron jobs 정상 등록
- [ ] 프로덕션 기능 정상 작동

---

**문서 작성일**: 2025-01-21
**최종 업데이트**: 2025-01-21
**작성자**: Claude Code
**결론**: GitHub Webhook 미생성이 근본 원인, Vercel CLI로 긴급 배포 후 프로젝트 재생성 권장
