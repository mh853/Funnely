#!/bin/bash

# Apply subscription notification migration to remote database
# This script applies the 20251218000000_enable_subscriptions_realtime.sql migration

PGPASSWORD='Audtjr1357!' psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -f supabase/migrations/20251218000000_enable_subscriptions_realtime.sql

echo ""
echo "Migration applied! Verifying..."
echo ""

# Verify trigger exists
PGPASSWORD='Audtjr1357!' psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -c "SELECT tgname, tgtype FROM pg_trigger WHERE tgname = 'on_subscription_change';"

echo ""
echo "Verifying Realtime publication..."
echo ""

# Verify Realtime is enabled
PGPASSWORD='Audtjr1357!' psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -c "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'company_subscriptions';"
