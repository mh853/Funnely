-- 광고 성과 연동에 네이버 검색광고를 추가하기 위해 ad_platform enum에 'naver'를 넣는다
-- ADD VALUE는 트랜잭션 안에서 실행할 수 없고, 같은 트랜잭션에서 새 값을 쓸 수도 없어 이 파일엔 이 한 줄만 둔다.
ALTER TYPE ad_platform ADD VALUE IF NOT EXISTS 'naver';
