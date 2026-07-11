-- Migration: search_path 보안 강화 과정에서 깨진 함수 5개 복구
-- Description: 20251217000005_fix_security_final.sql이 search_path 하이재킹 방지를 위해
-- 여러 SECURITY DEFINER 함수의 search_path를 일괄적으로 ''(빈 값)으로 바꿨는데, 그 중
-- 5개 함수는 본문에서 테이블/확장기능을 스키마 없이(unqualified) 참조하고 있어 실제로는
-- 항상 "relation does not exist" 또는 "function does not exist" 에러로 실패하고 있었다.
-- 특히 generate_invitation_code()는 팀원 초대 링크 생성 자체를 완전히 막고 있었고(요청 시
-- 500 에러), increment_landing_page_submissions()는 공개 랜딩페이지에서 리드가 제출될
-- 때마다 호출되지만 호출부(leads/submit/route.ts)가 에러를 무시하고 있어 사용자에게는
-- 보이지 않는 채로 submissions_count가 계속 누락되고 있었다.
-- search_path를 비우는 대신 'public'으로 명시하고, pgcrypto가 설치된 extensions 스키마의
-- 함수는 완전한 스키마 경로로 직접 참조해 안전하게 고정한다.
-- Created: 2026-07-12

CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := encode(extensions.gen_random_bytes(12), 'base64');
    v_code := replace(replace(replace(v_code, '+', ''), '/', ''), '=', '');
    v_code := substr(v_code, 1, 16);

    SELECT EXISTS(
      SELECT 1 FROM public.company_invitations WHERE invitation_code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.company_invitations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_landing_page_submissions(page_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.landing_pages
  SET submissions_count = COALESCE(submissions_count, 0) + 1
  WHERE id = page_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_external_page_submissions(page_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.external_collection_pages
  SET submissions_count = COALESCE(submissions_count, 0) + 1
  WHERE id = page_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_external_page_views(page_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.external_collection_pages
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = page_id;
END;
$$;
