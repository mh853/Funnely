-- ============================================================================
-- 콜 담당자 자동 배정 시스템 비활성화
-- ============================================================================
-- 설계 문서: claudedocs/analytics-conversion-rate-fix.md
-- 목적: 자동 배정을 수동 분배 시스템으로 전환
-- 날짜: 2025-12-25
-- ============================================================================

-- 1. 기존 자동 배정 트리거 제거
DROP TRIGGER IF EXISTS trigger_leads_auto_assign ON leads;

-- 2. 함수는 유지 (향후 수동 분배 로직에서 참고용)
-- auto_assign_call_staff() 함수는 그대로 보존

-- 3. 함수 주석 업데이트
COMMENT ON FUNCTION auto_assign_call_staff(UUID) IS
  '[DEPRECATED] 이전 자동 배정 함수 (트리거 제거됨). 수동 분배 시스템으로 전환됨. 2025-12-25';

-- 4. 미배정 리드 조회용 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_leads_call_assigned_null
ON leads(company_id, created_at)
WHERE call_assigned_to IS NULL;

COMMENT ON INDEX idx_leads_call_assigned_null IS
  '미배정 리드 조회 성능 최적화 (수동 분배 시스템)';

-- 5. 미배정 리드 확인용 뷰 생성 (모니터링용)
CREATE OR REPLACE VIEW unassigned_leads_stats AS
SELECT
  company_id,
  COUNT(*) as unassigned_count,
  MIN(created_at) as oldest_lead,
  MAX(created_at) as newest_lead
FROM leads
WHERE call_assigned_to IS NULL
GROUP BY company_id;

COMMENT ON VIEW unassigned_leads_stats IS
  '회사별 미배정 리드 현황 (수동 분배 시스템 모니터링용)';

-- ============================================================================
-- 롤백 계획 (긴급 시 자동 배정 재활성화)
-- ============================================================================
-- 롤백이 필요한 경우 아래 명령어 실행:
--
-- CREATE TRIGGER trigger_leads_auto_assign
--   BEFORE INSERT ON leads
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_auto_assign_call_staff();
-- ============================================================================
