# Support Tickets: Pagination & Search Design

## 개요

admin/support와 dashboard/support 페이지에 페이지네이션과 실시간 검색 기능을 추가합니다.

### 목표
- **Admin**: 회사명, 제목, 내용에 대한 실시간 검색
- **Both**: 페이지 단위 티켓 표시 (무한 스크롤 없음)
- **Both**: 성능 최적화된 데이터 로딩

---

## 1. API 설계

### 1.1 Admin Tickets API 업데이트

**Endpoint**: `GET /api/admin/support/tickets`

**현재 파라미터**:
- `status`: 상태 필터
- `priority`: 우선순위 필터
- `category`: 카테고리 필터
- `companyId`: 회사 ID 필터
- `limit`: 페이지 크기 (기본: 50, 최대: 100)
- `offset`: 시작 위치

**추가 파라미터**:
```typescript
{
  search?: string  // 검색 쿼리 (회사명, 제목, 내용)
  page?: number    // 페이지 번호 (1-based)
  perPage?: number // 페이지당 항목 수 (기본: 20, 최대: 50)
}
```

**응답 형식**:
```typescript
{
  success: true,
  tickets: Ticket[],
  pagination: {
    total: number      // 전체 항목 수
    page: number       // 현재 페이지
    perPage: number    // 페이지당 항목 수
    totalPages: number // 전체 페이지 수
    hasMore: boolean   // 다음 페이지 존재 여부
  },
  search?: {
    query: string      // 검색어
    resultsCount: number // 검색 결과 수
  }
}
```

**검색 로직**:
```sql
-- PostgreSQL Full-Text Search
WHERE
  company.name ILIKE '%search%' OR
  subject ILIKE '%search%' OR
  description ILIKE '%search%'
```

---

### 1.2 Dashboard Tickets API 업데이트

**Endpoint**: `GET /api/support/tickets`

**추가 파라미터**:
```typescript
{
  page?: number    // 페이지 번호 (1-based)
  perPage?: number // 페이지당 항목 수 (기본: 20, 최대: 50)
}
```

**응답 형식**: Admin API와 동일 (검색 제외)

---

## 2. 백엔드 구현

### 2.1 Admin API Route 수정

**파일**: `/src/app/api/admin/support/tickets/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // ... 권한 확인

  const { searchParams } = new URL(request.url)

  // 페이지네이션 파라미터
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('perPage') || '20')))
  const offset = (page - 1) * perPage

  // 검색 파라미터
  const search = searchParams.get('search')?.trim()

  // 필터 파라미터
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const category = searchParams.get('category')

  // 쿼리 빌드
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      company:companies!support_tickets_company_id_fkey(id, name, business_number),
      created_by:users!support_tickets_created_by_user_id_fkey(id, full_name, email),
      assigned_admin:users!support_tickets_assigned_admin_id_fkey(id, full_name),
      messages:support_ticket_messages(count)
    `, { count: 'exact' })

  // 검색 조건 적용
  if (search) {
    query = query.or(
      `subject.ilike.%${search}%,` +
      `description.ilike.%${search}%,` +
      `company.name.ilike.%${search}%`
    )
  }

  // 필터 조건 적용
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (category) query = query.eq('category', category)

  // 정렬 및 페이지네이션
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  const { data: tickets, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const totalPages = Math.ceil((count || 0) / perPage)

  return NextResponse.json({
    success: true,
    tickets: tickets || [],
    pagination: {
      total: count || 0,
      page,
      perPage,
      totalPages,
      hasMore: page < totalPages,
    },
    ...(search && {
      search: {
        query: search,
        resultsCount: count || 0,
      },
    }),
  })
}
```

**주의사항**:
- Supabase의 `.or()` 필터는 현재 테이블의 컬럼에만 작동
- 회사명 검색은 별도 처리 필요 또는 클라이언트 사이드 필터링

**대안: textSearch 사용** (추천)
```typescript
// 데이터베이스에 검색용 컬럼 추가 (마이그레이션)
ALTER TABLE support_tickets
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce(subject, '') || ' ' ||
    coalesce(description, '')
  )
) STORED;

CREATE INDEX idx_support_tickets_search
ON support_tickets USING GIN(search_vector);

// API에서 사용
if (search) {
  query = query.textSearch('search_vector', search, {
    type: 'plain',
  })
}
```

---

### 2.2 Dashboard API Route 수정

**파일**: `/src/app/api/support/tickets/route.ts`

```typescript
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  // 페이지네이션
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('perPage') || '20')))
  const offset = (page - 1) * perPage

  // 필터
  const status = searchParams.get('status')

  let query = supabase
    .from('support_tickets')
    .select('*', { count: 'exact' })
    .eq('company_id', user.user_metadata.company_id)

  if (status) {
    query = query.eq('status', status)
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  const { data: tickets, error, count } = await query

  const totalPages = Math.ceil((count || 0) / perPage)

  return NextResponse.json({
    success: true,
    tickets: tickets || [],
    pagination: {
      total: count || 0,
      page,
      perPage,
      totalPages,
      hasMore: page < totalPages,
    },
  })
}
```

---

## 3. 프론트엔드 구현

### 3.1 공통 Pagination Component

**파일**: `/src/components/ui/pagination.tsx`

```typescript
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const generatePageNumbers = () => {
    const pages: (number | string)[] = []
    const showMax = 5 // 한번에 표시할 최대 페이지 수

    if (totalPages <= showMax) {
      // 전체 페이지가 적으면 모두 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 많으면 현재 페이지 중심으로 표시
      let start = Math.max(1, currentPage - 2)
      let end = Math.min(totalPages, currentPage + 2)

      if (currentPage <= 3) {
        end = 5
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 4
      }

      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push('...')
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) return null

  const pages = generatePageNumbers()

  return (
    <div className={`flex items-center justify-center gap-1 ${className || ''}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, index) =>
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page as number)}
            className="h-8 w-8 p-0"
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

---

### 3.2 Admin Page 수정

**파일**: `/src/app/admin/support/page.tsx`

**추가 State**:
```typescript
const [currentPage, setCurrentPage] = useState(1)
const [perPage, setPerPage] = useState(20)
const [totalPages, setTotalPages] = useState(0)
const [totalCount, setTotalCount] = useState(0)
const [searchQuery, setSearchQuery] = useState('')
const [debouncedSearch, setDebouncedSearch] = useState('')
```

**Debounced Search**:
```typescript
// useEffect for debouncing search
useEffect(() => {
  const handler = setTimeout(() => {
    setDebouncedSearch(searchQuery)
    setCurrentPage(1) // 검색 시 첫 페이지로 이동
  }, 500) // 500ms 딜레이

  return () => clearTimeout(handler)
}, [searchQuery])
```

**Fetch Function**:
```typescript
async function fetchData() {
  try {
    setLoading(true)
    const params = new URLSearchParams({
      page: currentPage.toString(),
      perPage: perPage.toString(),
    })

    if (filter !== 'all') params.set('status', filter)
    if (debouncedSearch) params.set('search', debouncedSearch)

    const [ticketsResponse, statsResponse] = await Promise.all([
      fetch(`/api/admin/support/tickets?${params}`),
      fetch('/api/admin/support/stats'),
    ])

    if (ticketsResponse.ok) {
      const data = await ticketsResponse.json()
      setTickets(data.tickets || [])
      setTotalPages(data.pagination.totalPages)
      setTotalCount(data.pagination.total)
    }

    // ... stats 처리
  } catch (error) {
    console.error('Error fetching support data:', error)
  } finally {
    setLoading(false)
  }
}
```

**UI 추가**:
```tsx
{/* 검색 및 필터 섹션 */}
<Card className="border-gray-200">
  <CardContent className="pt-5 space-y-4">
    {/* 검색창 */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder="회사명, 제목, 내용으로 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>

    {/* 검색 결과 표시 */}
    {debouncedSearch && (
      <div className="text-sm text-gray-600">
        <span className="font-medium">{totalCount}개</span>의 검색 결과
      </div>
    )}

    {/* 필터 버튼 */}
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={filter === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => { setFilter('all'); setCurrentPage(1); }}
      >
        전체
      </Button>
      {/* ... 기타 필터 버튼 */}
    </div>
  </CardContent>
</Card>

{/* 티켓 목록 */}
<div className="space-y-4">
  {/* 헤더 정보 */}
  <div className="flex items-center justify-between text-sm text-gray-600">
    <div>
      전체 <span className="font-medium">{totalCount}</span>개 티켓
      {totalPages > 0 && (
        <span className="ml-2">
          (페이지 {currentPage} / {totalPages})
        </span>
      )}
    </div>
    <select
      value={perPage}
      onChange={(e) => {
        setPerPage(Number(e.target.value))
        setCurrentPage(1)
      }}
      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
    >
      <option value="10">10개씩 보기</option>
      <option value="20">20개씩 보기</option>
      <option value="30">30개씩 보기</option>
      <option value="50">50개씩 보기</option>
    </select>
  </div>

  {/* 티켓 목록 */}
  {loading ? (
    <Card><CardContent className="pt-6 text-center text-gray-500">로딩 중...</CardContent></Card>
  ) : tickets.length === 0 ? (
    <Card>
      <CardContent className="pt-6 text-center text-gray-500">
        {debouncedSearch ? '검색 결과가 없습니다' : '티켓이 없습니다'}
      </CardContent>
    </Card>
  ) : (
    tickets.map((ticket) => (
      // ... 티켓 카드
    ))
  )}

  {/* 페이지네이션 */}
  <Pagination
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={setCurrentPage}
    className="mt-6"
  />
</div>
```

---

### 3.3 Dashboard Page 수정

**동일한 패턴 적용** (검색 제외):
```typescript
const [currentPage, setCurrentPage] = useState(1)
const [perPage, setPerPage] = useState(20)
const [totalPages, setTotalPages] = useState(0)
const [totalCount, setTotalCount] = useState(0)

// fetchTickets 수정
async function fetchTickets() {
  const params = new URLSearchParams({
    page: currentPage.toString(),
    perPage: perPage.toString(),
  })
  if (filter !== 'all') params.set('status', filter)

  const response = await fetch(`/api/support/tickets?${params}`)
  const data = await response.json()

  setTickets(data.tickets || [])
  setTotalPages(data.pagination.totalPages)
  setTotalCount(data.pagination.total)
}
```

---

## 4. 데이터베이스 최적화

### 4.1 검색 성능 향상 (Optional)

**마이그레이션**: `/supabase/migrations/20251223000001_add_search_index.sql`

```sql
-- Full-Text Search를 위한 Generated Column 추가
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce(subject, '') || ' ' ||
    coalesce(description, '')
  )
) STORED;

-- GIN Index 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_support_tickets_search
ON support_tickets USING GIN(search_vector);

-- 회사 이름도 검색하려면 companies 테이블도 수정
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS name_search tsvector
GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(name, ''))
) STORED;

CREATE INDEX IF NOT EXISTS idx_companies_name_search
ON companies USING GIN(name_search);
```

---

## 5. 구현 순서

### Phase 1: 백엔드 페이지네이션
1. ✅ Admin API 페이지네이션 추가
2. ✅ Dashboard API 페이지네이션 추가
3. ✅ API 응답 형식 정의

### Phase 2: 프론트엔드 페이지네이션
1. Pagination 컴포넌트 작성
2. Admin 페이지 적용
3. Dashboard 페이지 적용

### Phase 3: Admin 검색 기능
1. Backend: 검색 로직 추가
2. Frontend: 검색 UI + Debounce
3. 검색 결과 표시

### Phase 4: 성능 최적화 (Optional)
1. Full-Text Search 인덱스 추가
2. API 응답 캐싱
3. 로딩 상태 개선

---

## 6. 테스트 케이스

### 페이지네이션
- [ ] 첫 페이지 로딩
- [ ] 페이지 이동 (다음/이전/첫/마지막)
- [ ] 페이지 크기 변경
- [ ] 빈 결과 처리
- [ ] 단일 페이지 결과 (페이지네이션 숨김)

### 검색 (Admin)
- [ ] 회사명 검색
- [ ] 제목 검색
- [ ] 내용 검색
- [ ] 복합 검색 (여러 필드)
- [ ] 검색 + 필터 조합
- [ ] 검색 결과 페이지네이션
- [ ] 검색어 지우기
- [ ] Debounce 동작 확인

### 필터 + 페이지네이션
- [ ] 필터 변경 시 첫 페이지로 이동
- [ ] 필터 + 검색 조합
- [ ] URL 파라미터 유지 (선택사항)

---

## 7. 성능 고려사항

### 현재 구현
- 페이지당 20개 (기본), 최대 50개
- 서버 사이드 필터링 및 페이지네이션
- 카운트 쿼리 포함 (`count: 'exact'`)

### 최적화 옵션
1. **Cursor-based Pagination** (대용량 데이터)
   - Offset 대신 created_at 기준
   - 더 빠른 쿼리 성능

2. **Estimated Count** (10,000+ 레코드)
   - `count: 'planned'` 사용
   - 정확한 카운트 대신 예상값

3. **Client-side Caching**
   - React Query / SWR 사용
   - 이미 방문한 페이지 캐싱

---

## 8. UI/UX 개선 아이디어

- **로딩 스켈레톤**: 페이지 전환 시 스켈레톤 UI
- **키보드 단축키**: 방향키로 페이지 이동
- **URL 동기화**: 페이지/검색/필터를 URL에 반영 (공유 가능)
- **무한 스크롤 옵션**: 사용자 설정으로 선택 가능
- **검색 히스토리**: 최근 검색어 저장
- **빠른 필터**: 자주 사용하는 필터 조합 저장

---

## 요약

| 기능 | Admin | Dashboard |
|------|-------|-----------|
| 페이지네이션 | ✅ 필수 | ✅ 필수 |
| 검색 (회사명, 제목, 내용) | ✅ 필수 | ❌ 없음 |
| 필터 (상태, 우선순위 등) | ✅ 유지 | ✅ 유지 |
| 페이지당 항목 수 변경 | ✅ 10/20/30/50 | ✅ 10/20/30/50 |
| Debounced Search | ✅ 500ms | - |
| Full-Text Search Index | 🔶 Optional | - |

**기대 효과**:
- 대량 티켓 처리 가능 (100+ 티켓)
- 빠른 검색 및 필터링
- 더 나은 사용자 경험
- 서버 부하 감소 (페이지 단위 로딩)
