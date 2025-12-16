# Phase 2.1: Daily Health Score Calculation Batch Job

## Overview
건강도 점수는 매일 자동으로 계산되어야 합니다. Vercel에서는 Cron Jobs를 통해 스케줄 기반 작업을 실행할 수 있습니다.

## Vercel Cron Jobs 설정 방법

### 1. `vercel.json` 파일 생성/수정
프로젝트 루트에 `vercel.json` 파일을 생성하고 cron 설정 추가:

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

**Schedule 설명**: `0 2 * * *` = 매일 오전 2시 (UTC) 실행

### 2. Cron 엔드포인트 생성
`src/app/api/cron/calculate-health-scores/route.ts` 파일 생성:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateHealthScore } from '@/lib/health/calculateHealthScore'

/**
 * GET /api/cron/calculate-health-scores
 * Daily batch job for calculating all company health scores
 *
 * Security: Vercel Cron requests include authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify this is a Vercel Cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. Get all active companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('status', 'active')

    if (companiesError) {
      console.error('[Cron] Failed to fetch companies:', companiesError)
      return NextResponse.json(
        { error: 'Failed to fetch companies' },
        { status: 500 }
      )
    }

    // 4. Calculate health score for each company
    const results = []
    const errors = []

    for (const company of companies || []) {
      try {
        // Calculate score
        const healthScore = await calculateHealthScore(company.id, supabase)

        // Save to database
        const { data: savedScore, error: saveError } = await supabase
          .from('health_scores')
          .insert({
            company_id: company.id,
            overall_score: healthScore.overall_score,
            engagement_score: healthScore.engagement_score,
            product_usage_score: healthScore.product_usage_score,
            support_score: healthScore.support_score,
            payment_score: healthScore.payment_score,
            health_status: healthScore.health_status,
            risk_factors: healthScore.risk_factors,
            recommendations: healthScore.recommendations,
            calculated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (saveError) {
          throw saveError
        }

        results.push({
          companyId: company.id,
          companyName: company.name,
          overallScore: healthScore.overall_score,
          healthStatus: healthScore.health_status,
        })

        console.log(`[Cron] Calculated health score for ${company.name}: ${healthScore.overall_score}`)
      } catch (error) {
        console.error(`[Cron] Error calculating health score for ${company.id}:`, error)
        errors.push({
          companyId: company.id,
          companyName: company.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // 5. Return results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      calculated: results.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[Cron] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

### 3. 환경변수 설정
Vercel 대시보드에서 환경변수 추가:

- `CRON_SECRET`: 랜덤 문자열 (예: `generate-random-32-char-string`)

**로컬 개발 환경** (`.env.local`):
```
CRON_SECRET=your-local-cron-secret
```

**Vercel Production** (Dashboard → Settings → Environment Variables):
```
CRON_SECRET=production-cron-secret
```

### 4. Vercel에 배포
```bash
git add vercel.json src/app/api/cron/
git commit -m "feat: Add daily health score calculation cron job"
git push
```

배포 후 Vercel 대시보드에서 확인:
- **Settings → Cron Jobs** 섹션에서 설정된 cron job 확인
- 다음 실행 예정 시간 확인

## Schedule 옵션

### Cron Expression 형식
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-6, Sunday=0)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### 예시
```json
"0 2 * * *"     // 매일 오전 2시 (UTC)
"0 */4 * * *"   // 4시간마다
"0 0 * * 0"     // 매주 일요일 자정
"0 0 1 * *"     // 매월 1일 자정
"*/15 * * * *"  // 15분마다
```

## 보안 고려사항

### 1. Authorization Header 검증
```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 2. CRON_SECRET 관리
- 강력한 랜덤 문자열 사용 (최소 32자)
- Production과 Development 환경 분리
- `.env.local`을 `.gitignore`에 포함 (절대 커밋하지 않음)

### 3. Rate Limiting
Vercel Cron은 자동으로 rate limiting 적용:
- Hobby plan: 최대 1개 cron job
- Pro plan: 최대 10개 cron job

## 모니터링 및 로깅

### 1. Vercel 로그 확인
```bash
vercel logs --follow
```

### 2. Cron Job 실행 내역
Vercel Dashboard → Logs → Filter by `/api/cron/calculate-health-scores`

### 3. 에러 알림 설정 (권장)
- Vercel Integrations에서 Slack 또는 Email 알림 설정
- Cron job 실패 시 자동 알림

## 수동 실행 (테스트)

### 로컬 테스트
```bash
curl -X GET http://localhost:3000/api/cron/calculate-health-scores \
  -H "Authorization: Bearer your-local-cron-secret"
```

### Production 테스트
```bash
curl -X GET https://your-domain.vercel.app/api/cron/calculate-health-scores \
  -H "Authorization: Bearer production-cron-secret"
```

## 대안: Supabase Edge Functions

Vercel Cron 대신 Supabase Edge Functions + pg_cron 사용 가능:

```sql
-- PostgreSQL에서 직접 cron 설정
SELECT cron.schedule(
  'daily-health-scores',
  '0 2 * * *',
  $$
  SELECT calculate_all_health_scores();
  $$
);
```

장점:
- Database에서 직접 실행 (네트워크 오버헤드 없음)
- Vercel 외부 의존성 제거

단점:
- TypeScript 로직을 SQL Function으로 변환 필요
- 디버깅이 더 어려움

## 참고 자료
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Expression Generator](https://crontab.guru/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
