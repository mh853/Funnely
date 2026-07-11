-- Migration: 벌크 태그 추가/제거를 단일 원자적 UPDATE로 처리하는 함수 추가
-- Description: BulkProcessor의 add_tags/remove_tags는 SELECT로 현재 태그를 읽어와
-- JS에서 합집합/차집합을 계산한 뒤 다시 UPDATE하는 lost-update 레이스가 있었다.
-- 같은 엔티티를 대상으로 한 두 벌크 작업이 겹치면(예: 관리자 콘솔에서 태그 추가와
-- 제거를 거의 동시에 실행), 나중에 커밋되는 UPDATE가 먼저 읽은 stale 스냅샷을
-- 기준으로 덮어써 앞선 변경이 사라질 수 있다. SET 절 안에서 현재 컬럼 값을 직접
-- 참조하는 단일 UPDATE 문으로 바꾸면, Postgres의 행 단위 쓰기 잠금이 동시 UPDATE를
-- 자동으로 직렬화하므로 각 UPDATE는 항상 최신 커밋된 값을 기준으로 계산된다.
-- 관리자 전용 벌크 콘솔이라 동시성 자체는 낮지만, 별도 SELECT 왕복이 없어져
-- 오히려 더 단순하고 빠르다.
-- Created: 2026-07-12

CREATE OR REPLACE FUNCTION public.bulk_add_lead_tags(p_lead_id UUID, p_tags TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leads
  SET tags = ARRAY(SELECT DISTINCT unnest(COALESCE(tags, ARRAY[]::text[]) || p_tags))
  WHERE id = p_lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_remove_lead_tags(p_lead_id UUID, p_tags TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leads
  SET tags = ARRAY(SELECT t FROM unnest(COALESCE(tags, ARRAY[]::text[])) t WHERE t != ALL(p_tags))
  WHERE id = p_lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_add_company_tags(p_company_id UUID, p_tags TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE companies
  SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{tags}',
    to_jsonb(ARRAY(
      SELECT DISTINCT unnest(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(settings->'tags', '[]'::jsonb))) || p_tags
      )
    ))
  )
  WHERE id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_remove_company_tags(p_company_id UUID, p_tags TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE companies
  SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{tags}',
    to_jsonb(ARRAY(
      SELECT t FROM jsonb_array_elements_text(COALESCE(settings->'tags', '[]'::jsonb)) t
      WHERE t != ALL(p_tags)
    ))
  )
  WHERE id = p_company_id;
END;
$$;
