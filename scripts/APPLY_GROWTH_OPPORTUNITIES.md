# Growth Opportunities Table Migration

## Problem
The `growth_opportunities` table is missing from the database, causing errors on the `/admin/growth-opportunities` page.

## Solution
Apply the migration manually via Supabase Dashboard.

## Steps

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/gprrqdhmnzsimkzdhfhh/sql

2. **Copy the SQL**
   - Open file: `scripts/apply-growth-opportunities.sql`
   - Copy all contents (Ctrl+A, Ctrl+C)

3. **Execute in Dashboard**
   - Paste into SQL Editor
   - Click the "Run" button
   - Wait for success message: "Growth opportunities table created successfully!"

4. **Verify**
   - Refresh the `/admin/growth-opportunities` page
   - The error should be resolved

## What This Migration Does

- Creates `growth_opportunities` table for upsell/downsell tracking
- Sets up Row Level Security (RLS) policies for admin access only
- Creates necessary indexes for query performance
- Adds triggers for automatic timestamp updates

## Note
The original migration file `20251217000011_growth_opportunities.sql` had a bug where it referenced `companies.status` instead of `companies.is_active`. This has been fixed in the standalone SQL file.
