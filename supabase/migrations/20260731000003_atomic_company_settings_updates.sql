-- BulkProcessor의 assign_cs_manager/add_note가 companies.settings(JSONB)를
-- SELECT로 읽어 JS에서 병합한 뒤 UPDATE로 통째로 덮어쓰는 lost-update 레이스가
-- 있었다(45차 QA에서 라이브 재현 확인 - 두 관리자가 거의 동시에 작업하면 나중
-- UPDATE가 먼저 커밋된 변경을 조용히 지움). 정확히 같은 종류의 문제가
-- 2026-07-12에 태그 기능에서 이미 발견돼 20260712000002_atomic_bulk_tag_operations.sql로
-- 원자적 UPDATE RPC로 고쳐졌는데, 이 두 함수는 그때 함께 고치지 못했다 - 같은
-- 패턴(SET 절에서 현재 컬럼값을 직접 참조하는 단일 UPDATE)으로 맞춘다.

CREATE OR REPLACE FUNCTION public.assign_company_cs_manager(p_company_id UUID, p_cs_manager_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE companies
  SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{cs_manager_id}',
    to_jsonb(p_cs_manager_id::text)
  )
  WHERE id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_company_note(p_company_id UUID, p_note TEXT, p_created_by TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE companies
  SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{notes}',
    COALESCE(settings->'notes', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'note', p_note,
        'created_by', COALESCE(p_created_by, 'system'),
        'created_at', now()
      )
    )
  )
  WHERE id = p_company_id;
END;
$$;
