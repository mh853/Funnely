-- Remove unused external collection fields
-- Created: 2025-01-31
-- Purpose: Simplify collection system by using shared collect_fields for both inline and external modes

-- Drop external_form_fields column (from 20250130100000_add_external_form_fields.sql)
ALTER TABLE landing_pages
DROP COLUMN IF EXISTS external_form_fields;

-- Drop external_page_slug column (from 20250130000000_add_collection_options.sql)
ALTER TABLE landing_pages
DROP COLUMN IF EXISTS external_page_slug;

-- Drop external_page_params column (from 20250130000000_add_collection_options.sql)
ALTER TABLE landing_pages
DROP COLUMN IF EXISTS external_page_params;

-- Drop related indexes
DROP INDEX IF EXISTS idx_landing_pages_external_slug;

COMMENT ON COLUMN landing_pages.collection_mode IS '수집 모드: inline (페이지 내), external (외부 페이지 - 고정 slug: collect-detail)';
