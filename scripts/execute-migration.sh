#!/bin/bash

# Execute admin enhancement migration
# This script applies the migration SQL file to the Supabase database

set -e

echo "📁 Loading environment variables..."
source .env.local

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env.local"
  exit 1
fi

echo "✅ Environment loaded"
echo ""
echo "🚀 Applying migration: 20251216000000_admin_enhancement_schema.sql"
echo ""

# Use psql if available, otherwise provide manual instructions
if command -v psql &> /dev/null; then
  psql "$DATABASE_URL" -f supabase/migrations/20251216000000_admin_enhancement_schema.sql
  echo ""
  echo "✅ Migration applied successfully!"
else
  echo "⚠️  psql command not found."
  echo ""
  echo "Please apply the migration manually via Supabase Dashboard:"
  echo ""
  echo "1. Go to: https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql/new"
  echo "2. Open file: supabase/migrations/20251216000000_admin_enhancement_schema.sql"
  echo "3. Copy and paste the SQL into the editor"
  echo "4. Click 'Run' to execute"
  echo ""
fi
