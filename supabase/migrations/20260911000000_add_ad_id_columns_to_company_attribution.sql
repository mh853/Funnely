-- ============================================================================
-- Add ad platform campaign/adgroup/ad ID columns to company_attribution
-- Created: 2026-09-11
-- Description: 노션 42번 - UTM/클릭ID 외에 광고 매체가 전달하는 캠페인/광고그룹/소재
-- 식별 ID도 최초/마지막 터치 기준으로 저장. Meta의 광고세트(adset) ID는 카드 요청에
-- 따라 별도 컬럼 없이 adgroup_id 컬럼에 통일해서 저장한다(캡처 시점에 alias 처리).
-- ============================================================================

ALTER TABLE company_attribution
  ADD COLUMN IF NOT EXISTS first_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS first_adgroup_id TEXT,
  ADD COLUMN IF NOT EXISTS first_ad_id TEXT,
  ADD COLUMN IF NOT EXISTS last_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS last_adgroup_id TEXT,
  ADD COLUMN IF NOT EXISTS last_ad_id TEXT;

COMMENT ON COLUMN company_attribution.first_adgroup_id IS 'Naver/Google 광고그룹 ID 또는 Meta 광고세트(adset) ID 통일 저장';
COMMENT ON COLUMN company_attribution.last_adgroup_id IS 'Naver/Google 광고그룹 ID 또는 Meta 광고세트(adset) ID 통일 저장';
