-- 노션 32번 후속 수정: 하드 삭제 완료 시각 컬럼 추가
--
-- hardPurgeDeletedCompanyData 크론이 companies.data_deleted_at만 보고 대상을 고르면,
-- 삭제가 끝난 회사도 data_deleted_at이 그대로 남아있어 다음날부터 매일 다시 같은
-- 회사를 골라 이미 빈 테이블에 DELETE를 반복 실행한다(무해하지만 낭비이고,
-- companiesPurged 카운트가 매일 계속 증가해 실제 신규 삭제 건수를 가림) -
-- 타임라인 시뮬레이션 중 발견.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS data_purged_at TIMESTAMPTZ;
