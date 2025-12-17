# Phase 2.3: Daily Health Score Calculation Batch Job

## 목표
매일 자동으로 모든 활성 회사의 건강도 점수를 계산하여 저장

## 구현 방법: Vercel Cron Jobs

### 1. vercel.json 설정
```json
{
  "crons": [
    {
      "path": "/api/cron/calculate-health-scores",
      "schedule": "0 2 * * *"
    }
  ]
}
```
**Schedule**: 매일 오전 2시 (UTC) 실행

### 2. Cron 엔드포인트
**파일**: `src/app/api/cron/calculate-health-scores/route.ts`

**주요 기능**:
- Vercel Cron 인증 검증 (CRON_SECRET)
- 모든 활성 회사 조회
- 각 회사 건강도 점수 계산 및 저장
- 에러 핸들링 및 로깅

### 3. 환경변수
```
CRON_SECRET=랜덤_32자_문자열
```

## 구현 순서

1. **vercel.json 생성** (2분)
   - Cron schedule 설정

2. **Cron 엔드포인트 구현** (30분)
   - GET /api/cron/calculate-health-scores
   - 인증 검증
   - 모든 활성 회사 조회
   - 건강도 계산 및 저장
   - 에러 핸들링

3. **환경변수 설정** (5분)
   - .env.local에 CRON_SECRET 추가
   - Vercel 대시보드에 환경변수 추가

4. **배포 및 테스트** (10분)
   - git push로 배포
   - Vercel 대시보드에서 Cron Job 확인
   - 수동 테스트 실행

**총 예상 시간**: ~1시간

## 보안 고려사항
- Authorization 헤더 검증 필수
- CRON_SECRET 강력한 랜덤 문자열 사용
- 에러 발생 시 상세 로그 기록

## 모니터링
- Vercel 대시보드 로그 확인
- 실행 내역 및 에러 추적
- Slack/Email 알림 설정 권장

## 참고
- [Vercel Cron Jobs 문서](https://vercel.com/docs/cron-jobs)
- Phase 2.1의 `/api/admin/health/calculate` 로직 재사용
