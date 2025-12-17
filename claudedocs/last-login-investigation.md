# Last Login Column Investigation

## Issue
Admin users table shows "마지막 로그인" column but all values display as "없음" (None).

## Root Cause Analysis

### ✅ What Works
1. **Database column exists**: `users.last_login TIMESTAMPTZ` column is properly defined
2. **API query correct**: `/api/admin/users` correctly selects `last_login` field
3. **Frontend display correct**: UI properly formats and displays the value with fallback to "없음"

### ❌ What's Missing
**No login tracking implementation**:
- Login page ([src/app/auth/login/page.tsx:84-87](src/app/auth/login/page.tsx#L84-L87)) only calls `supabase.auth.signInWithPassword()`
- No code updates `users.last_login` after successful authentication
- No database trigger to auto-update on sign-in
- Middleware ([src/middleware.ts:73](src/middleware.ts#L73)) checks auth but doesn't track login time

## Current Status
All 5 users have `last_login = NULL`:
- munong2@gmail.com ❌
- mhc853@gmail.com ❌
- mh853@gmail.com ❌
- 1989comp@gmail.com ❌
- woowoo4864@gmail.com ❌

## Solution

### Migration Created
**File**: [supabase/migrations/20251217000012_track_last_login.sql](supabase/migrations/20251217000012_track_last_login.sql)

**What it does**:
1. **Creates function** `handle_auth_signin()` - updates `users.last_login` when triggered
2. **Creates trigger** `on_auth_signin` - fires on `auth.users.last_sign_in_at` update
3. **Backfills data** - copies existing `last_sign_in_at` from `auth.users` to `users.last_login`

### How It Works
```
User signs in
  → Supabase Auth updates auth.users.last_sign_in_at
    → Trigger 'on_auth_signin' fires
      → Function handle_auth_signin() executes
        → Updates users.last_login = NOW()
```

## Implementation Steps

### Option 1: Supabase Dashboard (Recommended)
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251217000012_track_last_login.sql`
3. Execute the SQL
4. Verify: Check that trigger exists and users get timestamps on next login

### Option 2: Command Line (psql)
```bash
PGPASSWORD='your_password' psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -f supabase/migrations/20251217000012_track_last_login.sql
```

### Verification
```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_signin';

-- Check users with last_login
SELECT email, last_login
FROM users
WHERE last_login IS NOT NULL
ORDER BY last_login DESC;
```

## Expected Results After Migration

1. **Immediate**: Existing users with login history will have `last_login` populated from `auth.users.last_sign_in_at`
2. **Ongoing**: Every user sign-in will automatically update their `last_login` timestamp
3. **UI**: Admin users table will show actual last login times instead of "없음"

## Scripts Created

1. **[scripts/check-last-login-status.mjs](scripts/check-last-login-status.mjs)** - Diagnostic script showing current status
2. **[scripts/apply-last-login-tracking.sh](scripts/apply-last-login-tracking.sh)** - Bash script to apply migration (requires psql)
3. **[scripts/setup-last-login.mjs](scripts/setup-last-login.mjs)** - Node.js setup attempt (RPC approach)

## Technical Details

### Database Schema
```sql
-- users table (already exists)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  last_login TIMESTAMPTZ,  -- ← This column exists but is never updated
  ...
);

-- auth.users table (Supabase managed)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  last_sign_in_at TIMESTAMPTZ,  -- ← Updated by Supabase Auth
  ...
);
```

### Trigger Logic
```sql
-- Fires when last_sign_in_at changes
CREATE TRIGGER on_auth_signin
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION handle_auth_signin();
```

## Alternative Approach (Not Recommended)

Could manually update `last_login` in the login page:

```typescript
// src/app/auth/login/page.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (!error && data.user) {
  // Manual update (not ideal - requires service role key on client)
  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', data.user.id)
}
```

**Why not recommended**:
- Requires service role key exposure to client
- Less reliable (skipped if navigation happens too fast)
- Doesn't handle SSO or other auth methods
- Database trigger is more robust and automatic

## Timeline

- **Created**: 2025-12-17
- **Status**: Ready for deployment
- **Risk**: Low (adds functionality, doesn't modify existing behavior)
- **Rollback**: Simply drop trigger and function if issues occur
