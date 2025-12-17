# Admin Companies Page - Design Analysis

## Issue Summary
Admin companies page ([/admin/companies](src/app/admin/companies/page.tsx)) shows no data due to API response structure mismatch with TypeScript type definitions.

## Current State Analysis

### 🎨 Frontend Design Intent

**Page**: [src/app/admin/companies/page.tsx](src/app/admin/companies/page.tsx)

**Intended Display** (lines 197-262):
```
테이블 컬럼:
1. 회사명 (name + short ID)
2. 담당자 (admin_user.full_name + email)
3. 사용자 (stats.total_users)
4. 리드 (stats.total_leads)
5. 페이지 (stats.landing_pages_count)
6. 상태 (is_active)
7. 가입일 (created_at)
```

**통계 요약** (lines 172-186):
- 총 회사 수 (pagination.total)

### 🔌 API Current Implementation

**File**: [src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts)

**What API Returns** (lines 118-123):
```typescript
{
  id,
  name,
  is_active,
  created_at,
  updated_at,
  user_count: number,
  lead_count: number,
  subscription_status: string | null
}
```

**Missing from API**:
- ❌ `admin_user` object
- ❌ `stats` object structure
- ❌ `slug` field
- ❌ `landing_pages_count`

### 📋 Type Definition

**File**: [src/types/admin.ts](src/types/admin.ts#L2-L28)

**Type Expects**:
```typescript
interface CompanyListItem {
  id: string
  name: string
  slug: string              // ❌ Not in DB
  is_active: boolean
  created_at: string

  admin_user: {             // ❌ Not queried by API
    id: string
    full_name: string
    email: string
  }

  stats: {                  // ❌ Not formatted by API
    total_users: number
    total_leads: number
    landing_pages_count: number
  }

  subscription?: {
    plan_type: string
    status: string
  }
}
```

## Root Cause: Three-Way Mismatch

### 1. Database Schema vs Type Definition
```
Type expects: slug (string)
Database has: NO slug column
Status: ❌ slug doesn't exist in companies table
```

### 2. API Query vs Type Definition
```
API queries: id, name, is_active, created_at, updated_at
Type expects: id, name, slug, is_active, created_at, admin_user, stats
Status: ❌ API doesn't query or format admin_user and stats
```

### 3. API Response Format vs Type Definition
```
API returns: { user_count, lead_count, subscription_status }
Type expects: { admin_user: {...}, stats: {...} }
Status: ❌ Flat structure vs nested objects
```

## Current Data in Database

### Companies (3 total):

**퍼널리** (971983c1...):
- ✅ Admin user: 최문호 (munong2@gmail.com, role: company_owner)
- 📊 Stats: 4 users, 38 leads, 5 landing pages

**홍란의 병원** (36ae6937...):
- ✅ Admin user: 홍란 (1989comp@gmail.com, role: company_owner)
- 📊 Stats: 1 users, 1 leads, 2 landing pages

**최문호의 병원** (09d7dcb7...):
- ⚠️ No admin user (no users at all)
- 📊 Stats: 0 users, 0 leads, 0 landing pages

## Design Solutions

### ✅ Solution 1: Fix API to Match Type (Recommended)

Update `/api/admin/companies` to return data matching `CompanyListItem` type.

**Changes Required**:

1. **Query admin user** (lines 95-125):
```typescript
const companiesWithDetails = await Promise.all(
  (companies || []).map(async (company) => {
    // Admin user (company_owner)
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('company_id', company.id)
      .eq('role', 'company_owner')
      .limit(1)
      .single()

    // User count
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)

    // Lead count
    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)

    // Landing pages count
    const { count: pagesCount } = await supabase
      .from('landing_pages')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)

    return {
      id: company.id,
      name: company.name,
      slug: company.short_id, // Use short_id as slug
      is_active: company.is_active,
      created_at: company.created_at,
      admin_user: adminUser || {
        id: '',
        full_name: '없음',
        email: '없음'
      },
      stats: {
        total_users: userCount || 0,
        total_leads: leadCount || 0,
        landing_pages_count: pagesCount || 0
      }
    }
  })
)
```

2. **Update response format** (line 128):
```typescript
return NextResponse.json({
  companies: companiesWithDetails,
  pagination: {
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    hasNext: (count || 0) > offset + limit,
    hasPrev: offset > 0
  }
})
```

**Pros**:
- ✅ Type-safe, no TypeScript errors
- ✅ Frontend works without changes
- ✅ Matches design intent exactly

**Cons**:
- ⚠️ More database queries (4 per company)
- ⚠️ Slower response time

### ⚠️ Solution 2: Update Type to Match API

Simplify type definition to match current API response.

**Changes Required**:

1. **Update CompanyListItem** (src/types/admin.ts):
```typescript
export interface CompanyListItem {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string

  // Flat structure
  user_count: number
  lead_count: number
  subscription_status: string | null
}
```

2. **Update frontend** (src/app/admin/companies/page.tsx):
```typescript
// Line 246-247: Update user count access
<td>{company.user_count}</td>

// Line 249-250: Update lead count access
<td>{company.lead_count}</td>

// Line 236-244: Remove admin_user display or make optional
// Line 252-254: Remove landing_pages_count or calculate differently
```

**Pros**:
- ✅ Faster API response
- ✅ Fewer database queries

**Cons**:
- ❌ Loses admin user information display
- ❌ No landing pages count
- ❌ Doesn't match original design intent

## Recommended Implementation

**Choose Solution 1** - Fix API to match type definition.

### Implementation Steps:

1. ✅ **Update API query logic** ([src/app/api/admin/companies/route.ts:95-125](src/app/api/admin/companies/route.ts#L95-L125))
   - Query admin user (company_owner)
   - Query landing pages count
   - Format response as nested objects

2. ✅ **Update response structure** ([src/app/api/admin/companies/route.ts:128-136](src/app/api/admin/companies/route.ts#L128-L136))
   - Match CompaniesListResponse type
   - Include proper pagination object

3. ✅ **Handle edge cases**
   - Companies with no admin user
   - Companies with no data

4. ✅ **Add slug field handling**
   - Use existing `short_id` as slug
   - Or add actual slug column to database

### Performance Optimization

**Current approach** (4 queries per company):
- 1 query for admin user
- 1 query for user count
- 1 query for lead count
- 1 query for landing pages count

**Optimized approach** (2 queries total):
```sql
-- Query 1: Get all companies with admin users
SELECT
  c.*,
  u.id as admin_id,
  u.full_name as admin_name,
  u.email as admin_email
FROM companies c
LEFT JOIN users u ON c.id = u.company_id AND u.role = 'company_owner'

-- Query 2: Get aggregated stats
SELECT
  company_id,
  COUNT(DISTINCT user_id) as user_count,
  COUNT(DISTINCT lead_id) as lead_count,
  COUNT(DISTINCT page_id) as page_count
FROM (
  SELECT company_id, id as user_id, NULL as lead_id, NULL as page_id FROM users
  UNION ALL
  SELECT company_id, NULL, id, NULL FROM leads
  UNION ALL
  SELECT company_id, NULL, NULL, id FROM landing_pages
) combined
GROUP BY company_id
```

This reduces N+1 query problem significantly.

## Testing Checklist

After implementing Solution 1:

- [ ] Companies list displays all 3 companies
- [ ] "퍼널리" shows admin: 최문호 (munong2@gmail.com)
- [ ] "퍼널리" shows stats: 4 users, 38 leads, 5 pages
- [ ] "홍란의 병원" shows admin: 홍란 (1989comp@gmail.com)
- [ ] "홍란의 병원" shows stats: 1 users, 1 leads, 2 pages
- [ ] "최문호의 병원" shows "없음" for admin (no company_owner)
- [ ] "최문호의 병원" shows stats: 0 users, 0 leads, 0 pages
- [ ] Pagination works correctly
- [ ] Search by company name works
- [ ] Status filter (active/inactive) works
- [ ] Click on row navigates to company detail page

## Related Files

**Frontend**:
- [src/app/admin/companies/page.tsx](src/app/admin/companies/page.tsx) - Companies list page
- [src/types/admin.ts](src/types/admin.ts) - Type definitions

**Backend**:
- [src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts) - API endpoint

**Diagnostics**:
- [scripts/check-companies-api.mjs](scripts/check-companies-api.mjs) - API structure checker

**Database**:
- `companies` table: 3 companies
- `users` table: 5 users (2 company_owners)
- `leads` table: 39 total leads
- `landing_pages` table: 7 total pages
