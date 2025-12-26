# 테스트 체크리스트 - RLS 우회 구독 쿼리 수정

**날짜**: 2025-12-26
**상태**: ✅ 코드 수정 완료 → 🔄 사용자 테스트 대기

---

## 🎯 완료된 수정 사항

### 코드 변경
- ✅ [src/lib/supabase/server.ts:45-64](src/lib/supabase/server.ts#L45-L64) - `createServiceClient()` 추가
- ✅ [src/app/dashboard/layout.tsx:1,27,30,46](src/app/dashboard/layout.tsx#L27) - Service Role 클라이언트 사용
- ✅ [.env.local](.env.local) - `SUPABASE_SERVICE_ROLE_KEY` 활성화

### 오류 수정
- ✅ Supabase SSR 쿠키 설정 오류 해결 (`getAll`, `setAll` 스텁 메서드 추가)

---

## 📋 테스트 절차

### 1. 개발 서버 재시작 (필수)
```bash
# 현재 실행 중인 서버 중지 (Ctrl+C)
# 그 다음 재시작
npm run dev
```

**중요**: `.env.local` 환경 변수 변경이 있었으므로 재시작 필수

---

### 2. 브라우저 테스트 준비

**권장 테스트 환경**:
- ✅ 크롬 시크릿 모드 (캐시 무효화)
- ✅ 강제 새로고침 (Cmd+Shift+R 또는 Ctrl+Shift+R)

**테스트 계정**:
- 이메일: `mh853@gmail.com`
- 회사: 퍼널리 (프로 플랜 활성)
- 예상 권한: "일반 사용자"

---

### 3. Server 로그 확인 (터미널)

**로그인 직후 터미널에서 다음 로그 확인**:

#### ✅ 성공 시나리오
```
🔍 [DEBUG] User: mh853@gmail.com
🔍 [DEBUG] Company ID: 971983c1-d197-4ee3-8cda-538551f2cfb2
🔍 [DEBUG] Subscription: {
  plan_id: '6f45ff8d-ee0c-4b75-907c-651ad51b9c2c'
}
🔍 [DEBUG] Subscription Error: null
🔍 [DEBUG] Plan: {
  features: {
    analytics: true,
    reports: true,
    db_schedule: true,
    reservation_schedule: true,
    dashboard: true,
    db_status: true,
    priority_support: true,
    advanced_schedule: true
  }
}
🔍 [DEBUG] Plan Error: null
🔍 [DEBUG] Final planFeatures: {
  "analytics": true,
  "reports": true,
  "db_schedule": true,
  "reservation_schedule": true,
  "dashboard": true,
  "db_status": true,
  "priority_support": true,
  "advanced_schedule": true
}
```

#### ❌ 실패 시나리오 (예전 오류)
```
🔍 [DEBUG] Subscription: null
🔍 [DEBUG] Subscription Error: {
  code: 'PGRST116',
  details: 'The result contains 0 rows',
  message: 'Cannot coerce the result to a single JSON object'
}
```

---

### 4. Browser 콘솔 로그 확인 (F12 → Console 탭)

#### ✅ 성공 시나리오
```
📱 [Sidebar] Received planFeatures: {
  analytics: true,
  reports: true,
  db_schedule: true,
  reservation_schedule: true,
  dashboard: true,
  db_status: true,
  priority_support: true,
  advanced_schedule: true
}

📱 [Sidebar] User profile: mh853@gmail.com 971983c1-d197-4ee3-8cda-538551f2cfb2

📱 [Sidebar] Processed navigation: [
  { name: '대시보드', requiredFeature: undefined, featureValue: 'N/A', disabled: false },
  { name: 'DB 현황', requiredFeature: 'db_status', featureValue: true, disabled: false },
  { name: 'DB 스케줄', requiredFeature: 'db_schedule', featureValue: true, disabled: false },
  { name: '예약 스케줄', requiredFeature: 'reservation_schedule', featureValue: true, disabled: false },
  { name: '트래픽 분석', requiredFeature: 'analytics', featureValue: true, disabled: false },
  { name: 'DB 리포트', requiredFeature: 'reports', featureValue: true, disabled: false },
  ...
]
```

#### ❌ 실패 시나리오
```
📱 [Sidebar] Received planFeatures: {}
📱 [Sidebar] Processed navigation: [
  { ..., disabled: true },
  { ..., disabled: true },
  ...
]
```

---

### 5. UI 시각적 확인

#### ✅ 성공 체크리스트
- [ ] **트래픽 분석** 메뉴: 활성화 (잠금 아이콘 없음, 클릭 가능)
- [ ] **DB 리포트** 메뉴: 활성화 (잠금 아이콘 없음, 클릭 가능)
- [ ] **DB 스케줄** 메뉴: 활성화 (잠금 아이콘 없음, 클릭 가능)
- [ ] **예약 스케줄** 메뉴: 활성화 (잠금 아이콘 없음, 클릭 가능)
- [ ] 헤더 드롭다운: "권한: 일반 사용자" 표시
- [ ] 각 메뉴 클릭 시 정상 페이지 이동

#### ❌ 실패 증상
- [ ] 잠금 아이콘 표시
- [ ] 회색 비활성 상태
- [ ] "프로 플랜 이상 필요" 툴팁
- [ ] 클릭 시 업그레이드 모달 표시

---

## 🐛 문제 발생 시 대응

### 시나리오 A: 서버 로그에 여전히 PGRST116 오류
**가능한 원인**:
1. 개발 서버 재시작을 안했음
2. `.env.local` 파일이 제대로 로드 안됨
3. Service Role Key가 잘못됨

**조치 방법**:
```bash
# 1. 서버 완전 중지 (Ctrl+C)
# 2. .env.local 파일 확인
cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY
# → eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcmpmZG54c2dnd3ltbHJmcWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjkzNjkxNSwiZXhwIjoyMDc4NTEyOTE1fQ.fZAvylrbHjwUFu4kGIMacFDFr40SsAHcFC7WFa42_AU
# 3. 재시작
npm run dev
```

### 시나리오 B: 서버 로그 정상, 브라우저 콘솔에서 빈 객체
**가능한 원인**:
- Server → Client 직렬화 문제
- React 하이드레이션 오류

**조치 방법**:
- 브라우저 개발자 도구 → Application → Clear storage → 새로고침
- 시크릿 모드로 재테스트

### 시나리오 C: 쿠키 설정 오류 재발생
**에러 메시지**:
```
⨯ Error: @supabase/ssr: createServerClient requires configuring getAll and setAll cookie methods
```

**조치 방법**:
- [src/lib/supabase/server.ts:54-61](src/lib/supabase/server.ts#L54-L61) 확인
- `getAll()`, `setAll()` 메서드 존재 여부 확인

### 시나리오 D: 일부 기능만 활성화
**증상**: analytics는 활성화, reports는 비활성화

**원인**: `subscription_plans.features` 데이터 불일치

**조치 방법**:
```bash
# 데이터베이스 확인 스크립트 실행
NEXT_PUBLIC_SUPABASE_URL=https://wsrjfdnxsggwymlrfqcc.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcmpmZG54c2dnd3ltbHJmcWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjkzNjkxNSwiZXhwIjoyMDc4NTEyOTE1fQ.fZAvylrbHjwUFu4kGIMacFDFr40SsAHcFC7WFa42_AU \
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await supabase.from('subscription_plans').select('*').eq('name', '프로 플랜').single();
  console.log('Features:', JSON.stringify(data.features, null, 2));
})();
"
```

---

## 📊 테스트 결과 보고 양식

### 성공 시
```
✅ 테스트 성공
- Server 로그: planFeatures에 모든 기능 true
- Browser 로그: Sidebar에서 planFeatures 정상 수신
- UI: 모든 프리미엄 메뉴 활성화
- 권한 표시: "일반 사용자"
```

### 실패 시
```
❌ 테스트 실패
- 문제 상황: [상세 설명]
- Server 로그: [복사하여 붙여넣기]
- Browser 로그: [복사하여 붙여넣기]
- 스크린샷: [첨부]
```

---

## 🎯 성공 기준

### 필수 조건 (모두 충족 필요)
1. ✅ Server 로그에서 `Subscription: { plan_id: '...' }` (not null)
2. ✅ Server 로그에서 `Final planFeatures: { analytics: true, reports: true, ... }`
3. ✅ Browser 로그에서 `Received planFeatures: { analytics: true, ... }`
4. ✅ UI에서 모든 프리미엄 기능 활성화 (잠금 아이콘 없음)

### 부가 조건
5. ✅ 헤더에 "권한: 일반 사용자" 표시
6. ✅ 각 메뉴 클릭 시 정상 페이지 이동
7. ✅ 콘솔에 에러 없음

---

## 🚀 다음 단계 (성공 후)

### 1. 디버그 로그 정리
성공 확인 후 불필요한 콘솔 로그 제거 또는 레벨 조정:
- [src/app/dashboard/layout.tsx:37-66](src/app/dashboard/layout.tsx#L37-L66)
- [src/components/dashboard/Sidebar.tsx:60-91](src/components/dashboard/Sidebar.tsx#L60-L91)

### 2. 프로덕션 환경 변수 설정
Vercel 프로젝트 설정:
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Key: `SUPABASE_SERVICE_ROLE_KEY`
3. Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. Scope: Production, Preview, Development

### 3. 코드 리뷰 및 커밋
```bash
git status
git add src/lib/supabase/server.ts src/app/dashboard/layout.tsx
git commit -m "fix: RLS 우회를 위한 Service Role 클라이언트 구현

- createServiceClient() 추가 (RLS 우회)
- layout.tsx에서 구독 쿼리에 Service Role 사용
- Supabase SSR 쿠키 설정 요구사항 충족 (getAll, setAll)"
git push
```

---

**작성일**: 2025-12-26
**작성자**: Claude Code
**상태**: 코드 수정 완료, 사용자 테스트 대기
**다음 액션**: 개발 서버 재시작 후 mh853@gmail.com 계정으로 로그인 테스트
