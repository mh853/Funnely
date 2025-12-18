# Subscription Notification Migration Guide

**Date**: 2025-12-18
**Status**: ⚠️ Migration Pending Application
**File**: `supabase/migrations/20251218000000_enable_subscriptions_realtime.sql`

## Problem

User reported: "dashboard/subscription 페이지에서 구독정보가 변경되면 어드민의 알림센터에 실시간 알림을 줘야해. 지금은 테스트 데이터만 보이고 이썽."

**Root Cause**: The database trigger that automatically creates notifications when subscriptions change has not been applied to the production database.

## Current Status

✅ **Migration file exists**: `20251218000000_enable_subscriptions_realtime.sql`
❌ **Not applied to database**: Trigger `on_subscription_change` does not exist
✅ **Subscriptions exist**: 3 active subscriptions found
❌ **No automatic notifications**: 0 subscription notifications created

## Migration Contents

The migration file contains:

1. **Realtime Enablement**: Adds `company_subscriptions` table to Supabase Realtime publication
2. **Notification Function**: `create_subscription_notification()` - automatically creates notifications
3. **Database Trigger**: `on_subscription_change` - fires on INSERT or UPDATE of subscriptions

### What It Does

**On Subscription INSERT** (New Subscription):
- Creates notification: `"{회사명} - 구독 시작"`
- Message varies by status:
  - Trial: `"{회사명}에서 {플랜명} 플랜 체험을 시작했습니다. (7일 무료 체험)"`
  - Active: `"{회사명}에서 {플랜명} 플랜 구독을 시작했습니다."`
- Type: `subscription_started`

**On Subscription UPDATE** (Status Change):
- Creates notification: `"{회사명} - 구독 상태 변경"`
- Message varies by new status:
  - `trial → active`: "정식 구독으로 전환되었습니다"
  - `active → cancelled`: "구독이 취소되었습니다"
  - `active → suspended`: "플랜이 정지되었습니다"
  - `active → expired`: "플랜이 만료되었습니다"
- Type: `subscription_changed`

## How to Apply Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc

2. **Navigate to SQL Editor**
   - Left sidebar → SQL Editor
   - Click "New query"

3. **Copy Migration SQL**
   - Open: `supabase/migrations/20251218000000_enable_subscriptions_realtime.sql`
   - Copy entire contents

4. **Execute Migration**
   - Paste SQL into editor
   - Click "Run" button
   - Verify success message

5. **Verify Installation**
   - Run verification query:
   ```sql
   -- Check trigger exists
   SELECT tgname, tgtype
   FROM pg_trigger
   WHERE tgname = 'on_subscription_change';

   -- Check Realtime enabled
   SELECT tablename
   FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
     AND tablename = 'company_subscriptions';
   ```

### Option 2: Supabase CLI

```bash
# Connect to remote database
npx supabase db push --linked

# Or apply specific migration
npx supabase db execute \
  --file supabase/migrations/20251218000000_enable_subscriptions_realtime.sql \
  --linked
```

## Testing After Migration

### 1. Check Script Verification

```bash
node scripts/check-subscription-trigger.mjs
```

**Expected Output**:
- ✅ Trigger installed
- ✅ Realtime enabled
- ✅ Existing subscriptions should have created notifications retroactively (if migration creates them)

### 2. Manual Testing

**Test New Subscription**:
1. Go to `/dashboard/subscription`
2. Select a different plan
3. Click "이 플랜으로 변경"
4. Check admin notification center
5. Should see: `"{회사명} - 구독 상태 변경"` notification

**Test Cancellation**:
1. Click "구독 취소" button
2. Confirm cancellation
3. Check admin notification center
4. Should see cancellation notification

### 3. Realtime Verification

**User Side** (`/dashboard/subscription`):
- Changes reflected immediately via router.refresh()
- Realtime subscription updates current subscription info

**Admin Side** (`/admin/dashboard`):
- NotificationBell shows new notification badge
- Clicking bell shows new subscription notification
- Notification appears without page refresh

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ User Action: Change Subscription                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Database: company_subscriptions                             │
│ - UPDATE plan_id, billing_cycle, etc.                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Trigger: on_subscription_change                             │
│ - Fires AFTER INSERT OR UPDATE                              │
│ - Calls create_subscription_notification()                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Function: create_subscription_notification()                │
│ - Queries company and plan names                            │
│ - Generates notification title/message                      │
│ - INSERT INTO notifications                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Realtime: Broadcasts to Subscribed Clients                  │
│ - NotificationBell (admin)                                   │
│ - Admin Subscriptions Page                                  │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ UI Update: Admin Sees Notification                          │
│ - Badge appears on bell icon                                │
│ - Notification appears in dropdown                          │
│ - No page refresh required                                  │
└─────────────────────────────────────────────────────────────┘
```

## Integration with Existing Systems

### NotificationBell Component

**Location**: `/src/app/admin/components/NotificationBell.tsx`

**Realtime Subscription** (lines 21-54):
```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'notifications',
}, (payload) => {
  // Optimistic update for new notifications
  if (payload.eventType === 'INSERT') {
    setNotifications(prev => [payload.new as Notification, ...prev])
  }
  // Update for read status changes
  else if (payload.eventType === 'UPDATE') {
    setNotifications(prev =>
      prev.map(n => n.id === (payload.new as any).id ? (payload.new as Notification) : n)
    )
  }
})
```

**Expected Behavior After Migration**:
- Subscription changes → Trigger fires → Notification created
- Realtime broadcasts INSERT event
- NotificationBell receives payload
- New notification added to state
- Bell icon badge updates (unread count)
- Notification appears in dropdown

### Admin Subscriptions Page

**Location**: `/src/app/admin/subscriptions/page.tsx`

**Realtime Subscription** (lines 90-119):
```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'company_subscriptions',
}, (payload) => {
  console.log('🔔 Realtime subscription change:', payload)
  setTimeout(() => {
    fetchSubscriptions()
  }, 50)
})
```

**Expected Behavior**:
- Admin monitoring all subscription changes
- Updates subscription list in real-time
- Combined with notification system for comprehensive monitoring

## Database Schema

### notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'subscription_started' | 'subscription_changed'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### company_subscriptions Table

```sql
CREATE TABLE company_subscriptions (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT,  -- 'trial' | 'active' | 'cancelled' | 'suspended' | 'expired'
  billing_cycle TEXT,  -- 'monthly' | 'yearly'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Troubleshooting

### Issue: Trigger Not Firing

**Check**:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_subscription_change';
```

**Solution**: Re-apply migration via Supabase Dashboard

### Issue: Notifications Not Appearing

**Check**:
1. Verify trigger exists (above query)
2. Check notifications table:
   ```sql
   SELECT * FROM notifications
   WHERE type IN ('subscription_started', 'subscription_changed')
   ORDER BY created_at DESC
   LIMIT 10;
   ```
3. Verify NotificationBell Realtime subscription is active
4. Check browser console for Realtime connection errors

**Solution**:
- If no notifications in DB → Trigger not working, re-apply migration
- If notifications in DB but not in UI → Realtime issue, check subscription setup

### Issue: Realtime Not Working

**Check**:
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

**Expected**: Should include both `notifications` and `company_subscriptions`

**Solution**: Re-apply Realtime enablement:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE company_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## Performance Considerations

- **Trigger Overhead**: Minimal - runs only on INSERT/UPDATE, not SELECT
- **Notification Growth**: Should implement cleanup for old notifications
- **Realtime Connections**: Each admin client maintains one WebSocket connection
- **Database Queries**: Trigger performs 2 SELECT queries (company, plan names)

## Future Enhancements

1. **Notification Cleanup**: Archive/delete old notifications after 30 days
2. **Notification Preferences**: Allow admins to configure which notifications they receive
3. **Email Notifications**: Send email for critical subscription events
4. **Webhook Integration**: POST to external systems on subscription changes
5. **Analytics**: Track notification delivery and read rates

## Related Documentation

- [Subscriptions Realtime Notification](/claudedocs/subscriptions-realtime-notification.md) - Original implementation doc
- [Dashboard Subscription Page Enhancement](/claudedocs/dashboard-subscription-page-enhancement.md) - User-side features

## Summary

**Current State**: Migration file exists but not applied to production database

**Required Action**: Apply migration via Supabase Dashboard SQL Editor

**Expected Outcome**: Automatic notification creation on all subscription changes

**User Impact**: Admin notification center will show real-time subscription events instead of only test data
