# Admin Companies Page - 404 Issue 진단

## 문제 상황

admin/companies 페이지에서 "회사가 없습니다" 메시지가 표시됨

## 원인 분석

### 1. API 엔드포인트 404 에러

```bash
curl http://localhost:3000/api/admin/companies
→ 404 Not Found (HTML 에러 페이지 반환)
```

### 2. 데이터는 정상

```bash
# Direct Supabase query works fine
node scripts/debug-companies-api.mjs
→ ✅ Found 3 companies (퍼널리, 홍란의 병원, 최문호의 병원)
```

### 3. 프론트엔드 로직

[src/app/admin/companies/page.tsx:44](src/app/admin/companies/page.tsx#L44):
```typescript
const response = await fetch(`/api/admin/companies?${params}`)
if (!response.ok) throw new Error('Failed to fetch companies')
```

- API가 404를 반환하면 catch 블록으로 이동
- `setError('회사 목록을 불러오는데 실패했습니다')` 실행
- `data.companies.length` 체크에서 실패 → "회사가 없습니다" 표시

## API 파일 상태 확인

### 파일 위치
- ✅ `/src/app/api/admin/companies/route.ts` 존재
- ✅ `export async function GET(request: NextRequest)` 정의됨
- ✅ TypeScript 타입 에러 없음
- ✅ 코드 로직 정상

### 가능한 원인

1. **Next.js 개발 서버 캐싱 문제**
   - 파일 변경 후 핫 리로드가 제대로 작동하지 않음
   - API 라우트가 라우팅 테이블에 등록되지 않음

2. **권한 미들웨어 문제**
   - `getSuperAdminUser()` 함수가 인증 실패를 반환할 수 있음
   - 하지만 일반적으로 401이나 403을 반환해야 함 (404가 아님)

3. **Import 경로 문제**
   - 다른 라이브러리 import 문제로 API 파일 자체가 로드되지 않음

## 해결 방법

### 즉시 시도할 수 있는 방법

1. **개발 서버 재시작** (가장 확실)
   ```bash
   # 개발 서버 종료
   pkill -f "next dev"

   # 다시 시작
   npm run dev
   ```

2. **브라우저 개발자 도구 확인**
   - Network 탭에서 실제 API 응답 확인
   - Console에서 에러 메시지 확인

3. **API 직접 테스트** (브라우저에서)
   ```
   http://localhost:3000/api/admin/companies?search=&status=all&page=1&limit=20
   ```

### 임시 해결책 (디버깅용)

API 파일에 console.log 추가:

```typescript
export async function GET(request: NextRequest) {
  console.log('🔵 API /api/admin/companies called');
  try {
    // ... existing code
  }
}
```

서버 터미널에서 로그 확인:
- 로그가 보이면: API는 호출되지만 내부 로직 문제
- 로그가 안 보이면: 라우팅 문제 (404 원인)

## 근본 원인 추정

Next.js App Router API 라우트 캐싱 문제일 가능성이 높음.
개발 서버를 재시작하면 해결될 것으로 예상됨.

## 재현 단계

1. 브라우저에서 `http://localhost:3000/admin/companies` 접속
2. Network 탭 확인: `/api/admin/companies?...` 요청 상태 확인
3. 404인 경우: 서버 재시작 필요
4. 401/403인 경우: 권한 문제
5. 500인 경우: API 내부 로직 에러

## 추가 진단 스크립트

```bash
# API 엔드포인트 직접 테스트
node scripts/debug-companies-api.mjs

# 전체 회사 데이터 확인
node scripts/check-subscription-simple.mjs
```

## 관련 파일

- Frontend: [src/app/admin/companies/page.tsx](src/app/admin/companies/page.tsx)
- API: [src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts)
- Types: [src/types/admin.ts](src/types/admin.ts)
