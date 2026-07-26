-- Migration: 공개 랜딩페이지 리드 중복 방지를 DB 트리거로 원자적으로 강제
-- Description: /api/landing-pages/submit는 "최근 3시간 내 동일 phone_hash
-- 존재 여부 조회 → INSERT"를 별도 요청으로 수행해, 두 요청이 거의 동시에
-- 들어오면(느린 모바일 네트워크에서의 이중 전송, 리플레이 등) 둘 다 같은
-- 조회 결과(없음)를 보고 둘 다 통과해 동일 전화번호로 중복 리드가 생성될 수
-- 있었다(TOCTOU race, curl 동시 요청 2건으로 재현 확인). 20260712000000의
-- enforce_landing_page_limit()와 동일한 패턴으로, 트랜잭션 범위 advisory
-- lock으로 같은 company_id+phone_hash에 대한 동시 INSERT를 직렬화해, 두 번째
-- 요청이 첫 번째 요청의 커밋을 기다렸다가 갱신된 상태로 다시 체크하게 한다.
-- 애플리케이션 레벨 체크(route.ts의 사전 조회)는 그대로 두고 이 트리거는
-- 최후 방어선 역할만 한다 — 정상 경로에서는 절대 걸리지 않아야 한다.
-- Created: 2026-07-26

CREATE OR REPLACE FUNCTION public.enforce_lead_dedup()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  IF NEW.phone_hash IS NULL THEN
    RETURN NEW;
  END IF;

  -- 같은 회사+같은 전화번호 해시에 대한 동시 INSERT를 직렬화 (트랜잭션 종료 시 자동 해제)
  PERFORM pg_advisory_xact_lock(hashtext(NEW.company_id::text || NEW.phone_hash));

  SELECT id INTO v_existing_id
  FROM leads
  WHERE company_id = NEW.company_id
    AND phone_hash = NEW.phone_hash
    AND created_at >= now() - interval '3 hours'
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'DUPLICATE_LEAD: %', v_existing_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enforce_lead_dedup ON leads;
CREATE TRIGGER trigger_enforce_lead_dedup
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION enforce_lead_dedup();
