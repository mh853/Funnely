# Admin Enhancement Migration Guide

## Phase 1.1: Database Schema Migration

### Step 1: Apply the Migration

Since we don't have `psql` access and Docker isn't running, we'll apply the migration via the Supabase Dashboard:

#### Option A: Supabase Dashboard SQL Editor (Recommended)

1. **Open Supabase Dashboard SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql/new

2. **Copy Migration SQL**:
   - Open file: `supabase/migrations/20251216000000_admin_enhancement_schema.sql`
   - Copy the entire SQL content (all 500+ lines)

3. **Execute Migration**:
   - Paste the SQL into the SQL editor
   - Click "Run" button (or Ctrl/Cmd + Enter)
   - Wait for execution to complete (should take 5-10 seconds)

4. **Verify Success**:
   - You should see success messages for each CREATE TABLE, INDEX, TRIGGER
   - Check for any error messages (there shouldn't be any)

#### Option B: Using Supabase CLI with Docker (Alternative)

If you start Docker Desktop:

```bash
# Start Docker Desktop first

# Reset local database and apply migrations
npx supabase db reset

# Or push migrations to remote
npx supabase db push
```

### Step 2: Verify Migration

After applying the migration, verify all tables were created:

```bash
node scripts/verify-admin-tables.js
```

Expected output:
```
✅ customer_health_scores - Exists
✅ onboarding_progress - Exists
✅ feature_usage_tracking - Exists
✅ revenue_metrics - Exists
✅ churn_records - Exists
✅ automation_workflows - Exists
✅ bulk_operations - Exists
✅ audit_logs - Exists
✅ admin_roles - Exists
✅ admin_role_assignments - Exists
✅ privacy_requests - Exists
✅ announcements - Exists
✅ in_app_messages - Exists
✅ email_templates - Exists

📊 Summary:
✅ Existing tables: 14/14
❌ Missing tables: 0/14

🔍 Checking admin_roles seed data...
✅ Found 4 admin roles:
   - super_admin: 슈퍼 관리자
   - cs_manager: 고객 성공 매니저
   - finance: 재무 담당자
   - analyst: 분석가
```

### Step 3: Update Progress

After successful verification:

```bash
# Commit the migration file
git add supabase/migrations/20251216000000_admin_enhancement_schema.sql
git add scripts/
git add claudedocs/
git commit -m "feat(db): Phase 1.1 - Admin enhancement schema migration

- Add 13 new tables for admin system enhancement
- Customer health scoring (customer_health_scores)
- Onboarding tracking (onboarding_progress)
- Feature usage analytics (feature_usage_tracking)
- Revenue metrics (revenue_metrics)
- Churn analysis (churn_records)
- Automation workflows (automation_workflows)
- Bulk operations (bulk_operations)
- RBAC system (admin_roles, admin_role_assignments)
- Privacy management (privacy_requests)
- Communication (announcements, in_app_messages, email_templates)
- Comprehensive indexes for query optimization
- Seed data for 4 default admin roles"

git push
```

## Troubleshooting

### Migration Fails with "already exists" Error

This is normal if you've tried applying the migration before. The migration uses `IF NOT EXISTS` clauses to be idempotent (safe to run multiple times).

### Some Tables Missing After Migration

Run the verification script to identify which tables are missing:

```bash
node scripts/verify-admin-tables.js
```

Then check the Supabase SQL Editor for any error messages.

### Can't Access Supabase Dashboard

Ensure you're logged in to the correct Supabase account and have access to project `wsrjfdnxsggwymlrfqcc`.

## Next Steps

After completing Phase 1.1, proceed to:

**Phase 1.2: 감사 로그 시스템 (Audit Log System)**
- Implement audit logging API endpoints
- Create audit log capture middleware
- Build admin UI for viewing logs

See [claudedocs/admin-enhancement-design.md](./admin-enhancement-design.md) for detailed specifications.

## Migration Details

The migration creates:

- **14 tables** (13 new + 1 existing audit_logs extended)
- **30+ indexes** for query optimization
- **4 triggers** for auto-updating timestamps
- **4 default admin roles** with permissions
- **JSONB columns** for flexible data storage
- **Foreign key relationships** with CASCADE deletes
- **Check constraints** for data validation

Total size: ~500 lines of SQL
Estimated execution time: 5-10 seconds
