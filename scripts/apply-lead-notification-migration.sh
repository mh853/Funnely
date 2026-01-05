#!/bin/bash

# Apply lead notification system migration to production

echo "Applying lead notification system migration..."

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Apply migration using Supabase CLI
supabase db push --db-url "postgresql://postgres.gprrqdhmnzsimkzdhfhh:Audtjr1357!@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

echo "Migration complete!"
