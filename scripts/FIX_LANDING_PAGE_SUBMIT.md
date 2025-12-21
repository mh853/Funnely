# Landing Page Submit 오류 수정 가이드

## 문제 상황

배포된 랜딩페이지에서 폼 제출 시 다음 오류 발생:
- **에러 1**: `relation "landing_pages" does not exist` - 조회수 증가 실패
- **에러 2**: `function auto_assign_call_staff(uuid) does not exist` - 리드 생성 실패

## 원인

데이터베이스 함수와 트리거가 누락됨 (테이블은 존재함)

## 해결 방법

### Supabase 대시보드에서 SQL 실행

1. **SQL Editor 열기**
   - URL: https://supabase.com/dashboard/project/gprrqdhmnzsimkzdhfhh/sql

2. **SQL 파일 복사**
   - 파일: `scripts/fix-landing-page-submit.sql`
   - 전체 내용 복사 (Ctrl+A, Ctrl+C)

3. **SQL 실행**
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭
   - 성공 메시지 확인: "Landing page functions and triggers fixed successfully!"

4. **테스트**
   - 랜딩페이지에서 폼 제출 테스트
   - 정상 작동 확인

## 수정 내용

이 스크립트는 **함수와 트리거만** 생성하며, 테이블은 건드리지 않음:

1. ✅ `increment_landing_page_views()` - 조회수 증가 함수
2. ✅ `auto_assign_call_staff()` - 담당자 자동 배정 함수
3. ✅ `trigger_auto_assign_call_staff()` - 트리거 함수
4. ✅ `trigger_leads_auto_assign` - leads 테이블 트리거

## 중요 사항

- **테이블은 수정하지 않음**: `landing_pages`와 `leads` 테이블은 기존 것을 그대로 사용
- **안전한 실행**: `CREATE OR REPLACE`와 `DROP IF EXISTS` 사용으로 중복 실행 가능
- **기존 데이터 보존**: 모든 기존 데이터는 그대로 유지됨

## 다른 관리자 페이지 문제

아래 관리자 페이지들도 DB 스키마 불일치로 오류가 있어. 별도로 수정 필요:

1. ✅ **admin/health** - 수정 완료
2. ✅ **admin/churn** - 수정 완료
3. ⏳ **admin/growth-opportunities** - `scripts/apply-growth-opportunities.sql` 실행 필요
