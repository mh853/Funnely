#!/bin/bash

# Apply last_login tracking migration to production database
# This script:
# 1. Creates trigger to auto-update last_login on signin
# 2. Backfills existing login data from auth.users

set -e

echo "🔐 Applying last_login tracking migration..."

# Load environment variables
source .env.local

# Apply migration
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -f supabase/migrations/20251217000012_track_last_login.sql

echo "✅ Migration applied successfully!"
echo ""
echo "📊 Checking results..."

# Verify trigger was created
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -c "SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'on_auth_signin';"

echo ""
echo "👥 Users with last_login data:"

# Check users with last_login values
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -c "SELECT email, last_login
      FROM users
      WHERE last_login IS NOT NULL
      ORDER BY last_login DESC
      LIMIT 10;"

echo ""
echo "✅ Done! Last login tracking is now enabled."
echo "💡 Users' last_login will be updated automatically on their next sign-in."
