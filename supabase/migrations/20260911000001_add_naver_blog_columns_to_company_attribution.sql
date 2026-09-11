-- ============================================================================
-- Add Naver blog post attribution columns to company_attribution
-- Created: 2026-09-11
-- Description: 노션 44번 - 네이버 블로그 배너를 통한 유입을 Referrer에서 추출한
-- 게시글 ID(logNo) 기준으로 최초/마지막 터치 저장. 기존 UTM 저장 로직과는 별개
-- 필드 - 블로그 재방문(UTM 없음)이 last_utm_* 값을 건드리면 안 되기 때문이다.
-- ============================================================================

ALTER TABLE company_attribution
  ADD COLUMN IF NOT EXISTS first_blog_post_id TEXT,
  ADD COLUMN IF NOT EXISTS first_blog_referrer TEXT,
  ADD COLUMN IF NOT EXISTS last_blog_post_id TEXT,
  ADD COLUMN IF NOT EXISTS last_blog_referrer TEXT;

COMMENT ON COLUMN company_attribution.first_blog_post_id IS '최초 네이버 블로그(blog.naver.com/m.blog.naver.com) Referrer에서 추출한 게시글 ID(logNo)';
COMMENT ON COLUMN company_attribution.last_blog_post_id IS '가장 최근 네이버 블로그 Referrer에서 추출한 게시글 ID - UTM 없는 직접 재방문으로는 갱신되지 않음';
