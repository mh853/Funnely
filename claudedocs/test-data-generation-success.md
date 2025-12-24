# 테스트 데이터 생성 완료

## 📊 생성된 데이터

성공적으로 78개의 테스트 리드가 생성되었습니다:

- **2024년 10월**: 15개 리드
- **2024년 11월**: 20개 리드
- **2024년 12월**: 25개 리드
- **2025년 1월**: 18개 리드

## 🔧 스크립트 실행

**파일**: `/Users/mh.c/medisync/scripts/create-test-leads.js`

**실행 명령**:
```bash
NEXT_PUBLIC_SUPABASE_URL=<your-url> \
SUPABASE_SERVICE_ROLE_KEY=<your-key> \
node scripts/create-test-leads.js
```

## ✅ 해결된 이슈

### Issue 1: 사용자 조회 실패
- **문제**: `.eq('is_active', true)` 조건으로 사용자를 찾을 수 없음
- **해결**: `is_active` 조건 제거, 사용자가 없는 경우 `call_assigned_to = null` 허용

### Issue 2: Invalid enum value 'qualified'
- **문제**: DB enum에 존재하지 않는 status 값 사용
- **해결**: 실제 DB에서 사용 중인 status 값으로 변경
  - Before: `['new', 'pending', 'contacted', 'qualified', 'converted', 'rejected', 'contract_completed', 'needs_followup']`
  - After: `['new', 'converted', 'rejected', 'contract_completed']`

### Issue 3: phone_hash not-null constraint
- **문제**: `phone_hash` 컬럼이 NOT NULL인데 값을 제공하지 않음
- **해결**: crypto 모듈로 SHA-256 해시 생성
  ```javascript
  const phoneHash = crypto
    .createHash('sha256')
    .update(phone.replace(/\D/g, ''))
    .digest('hex')
  ```

## 🧪 테스트 방법

### "전체" 필터 테스트

1. **URL 접속**: `/dashboard/reports?year=all&month=all`
2. **기대 결과**:
   - 모든 4개월의 데이터가 날짜순으로 표시
   - 총 78개 리드 (기존 12월 데이터 + 새로운 테스트 데이터)
   - 각 월별로 데이터가 구분되어 표시

### 월별 필터 테스트

각 월을 선택하여 해당 월의 데이터만 표시되는지 확인:

- **2024년 10월**: 15개 리드
- **2024년 11월**: 20개 리드
- **2024년 12월**: 25개 + 기존 데이터
- **2025년 1월**: 18개 리드

## 📝 생성된 데이터 특성

각 리드는 다음 속성을 가집니다:

- **이름**: `테스트 리드 {year}년 {month}월 {index}`
- **전화번호**: 랜덤 생성된 010 번호
- **이메일**: `test{year}{month}_{index}@example.com`
- **상태**: new, converted, rejected, contract_completed 중 랜덤
- **기기 타입**: pc 또는 mobile 중 랜덤
- **담당자**: null (회사에 사용자가 없음)
- **생성일시**: 해당 월의 랜덤 날짜 및 시간

## 🎯 다음 단계

테스트 데이터가 생성되었으므로:

1. ✅ `/dashboard/reports?year=all&month=all` 접속하여 "전체" 필터 동작 확인
2. ✅ 각 월별 필터 선택 시 정확한 데이터만 표시되는지 확인
3. ✅ 날짜별 정렬이 올바른지 확인 (오름차순)
4. ✅ 부서별, 담당자별 탭에서도 데이터가 올바르게 표시되는지 확인

---

**생성일**: 2025-12-25
**상태**: ✅ 완료
**총 생성 리드 수**: 78개
