# UUID 에러 최종 해결 - Supabase null 비교 문제

**날짜**: 2025-12-25
**버그 타입**: Supabase Query API Misuse
**심각도**: 🔴 Critical
**상태**: ✅ 해결 완료

---

## 🎯 최종 근본 원인

### 문제 코드 (Line 190)
```typescript
.eq('call_assigned_to', null)  // ❌ 잘못된 방법
```

### Supabase의 동작
```javascript
// Supabase가 내부적으로 변환
.eq('call_assigned_to', null)
→ WHERE call_assigned_to = 'null'  // ❌ 문자열 "null"로 변환
→ PostgreSQL: invalid input syntax for type uuid: "null"
```

**왜 문제가 발생했는가?**
- Supabase의 `.eq()` 메서드는 모든 값을 문자열로 변환
- JavaScript `null`이 PostgreSQL에서 문자열 `"null"`이 됨
- UUID 컬럼은 문자열 `"null"`을 UUID로 파싱하려다 실패

---

## ✅ 해결 방법

### 수정된 코드 (Line 190)
```typescript
.is('call_assigned_to', null)  // ✅ 올바른 방법
```

### Supabase의 올바른 동작
```javascript
// Supabase의 .is() 메서드
.is('call_assigned_to', null)
→ WHERE call_assigned_to IS NULL  // ✅ 정확한 SQL
```

---

## 📊 디버깅 로그 분석

### 로그에서 확인된 사실
```javascript
✅ companyId: '971983c1-d197-4ee3-8cda-538551f2cfb2'  // 정상
✅ Regular users found: 2  // 정상
✅ User IDs: [
    { id: '6e53371d-601f-48e6-8b72-5efc12581d46', ... },  // 정상 UUID
    { id: '223abffa-cc9e-42f9-8ed1-c83155a4e46d', ... }   // 정상 UUID
]
✅ First 3 assignments: [
    { userId: '6e53371d-601f-48e6-8b72-5efc12581d46', userIdType: 'string', ... }  // 정상
]

❌ Distribution errors: [16개 모두 동일]
    error: { code: '22P02', message: 'invalid input syntax for type uuid: "null"' }
```

**결론**:
- 사용자 데이터 ✅ 정상
- 배정 로직 ✅ 정상
- **업데이트 쿼리의 null 비교** ❌ 문제

---

## 🔧 수정 사항

**파일**: `/Users/mh.c/medisync/src/app/api/leads/distribute/route.ts`
**라인**: 190

### Before:
```typescript
const updatePromises = assignments.map(async ({ leadId, userId }) => {
  return supabase
    .from('leads')
    .update({ call_assigned_to: userId })
    .eq('id', leadId)
    .eq('call_assigned_to', null) // ❌ 문제의 코드
})
```

### After:
```typescript
const updatePromises = assignments.map(async ({ leadId, userId }) => {
  return supabase
    .from('leads')
    .update({ call_assigned_to: userId })
    .eq('id', leadId)
    .is('call_assigned_to', null) // ✅ 수정된 코드
})
```

---

## 📖 Supabase Query API 가이드

### NULL 값 비교 방법

#### ❌ 잘못된 방법
```typescript
.eq('column', null)           // WHERE column = 'null' (문자열)
.neq('column', null)          // WHERE column != 'null' (문자열)
```

#### ✅ 올바른 방법
```typescript
.is('column', null)           // WHERE column IS NULL
.not('column', 'is', null)    // WHERE column IS NOT NULL
```

### 예제

```typescript
// ❌ 잘못된 예
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('deleted_at', null)  // 아무것도 찾지 못함

// ✅ 올바른 예
const { data } = await supabase
  .from('users')
  .select('*')
  .is('deleted_at', null)  // 삭제되지 않은 사용자 조회
```

---

## 🧪 테스트 결과 예상

### 수정 후 예상 동작

**1단계: 미배정 리드 조회**
```sql
SELECT * FROM leads
WHERE company_id = '971983c1-d197-4ee3-8cda-538551f2cfb2'
  AND call_assigned_to IS NULL  -- ✅ 정상 조회
ORDER BY created_at;
```

**2단계: Round Robin 배정**
```javascript
16개 리드 → 2명 사용자
- 최문호3: 8개
- 추가테스트: 8개
```

**3단계: 업데이트 쿼리**
```sql
-- 각 리드에 대해 실행 (16번)
UPDATE leads
SET call_assigned_to = '6e53371d-601f-48e6-8b72-5efc12581d46'
WHERE id = '602dbae9-b12d-4b31-a653-c696121a50e4'
  AND call_assigned_to IS NULL;  -- ✅ 정상 실행

UPDATE leads
SET call_assigned_to = '223abffa-cc9e-42f9-8ed1-c83155a4e46d'
WHERE id = '50ffc92d-9918-4707-9fef-7b5b52757080'
  AND call_assigned_to IS NULL;  -- ✅ 정상 실행

-- ... (나머지 14개)
```

**4단계: 성공 응답**
```json
{
  "success": true,
  "data": {
    "message": "16개의 리드가 2명의 담당자에게 분배되었습니다.",
    "distributed": 16,
    "userCount": 2,
    "stats": [
      { "userId": "6e53371d-601f-48e6-8b72-5efc12581d46", "userName": "최문호3", "assignedCount": 8 },
      { "userId": "223abffa-cc9e-42f9-8ed1-c83155a4e46d", "userName": "추가테스트", "assignedCount": 8 }
    ]
  }
}
```

---

## 🔍 학습 포인트

### Supabase vs Raw SQL 차이점

| 작업 | Supabase | PostgreSQL SQL |
|------|----------|----------------|
| NULL 체크 | `.is('col', null)` | `WHERE col IS NULL` |
| NOT NULL | `.not('col', 'is', null)` | `WHERE col IS NOT NULL` |
| 같음 비교 | `.eq('col', value)` | `WHERE col = value` |
| 다름 비교 | `.neq('col', value)` | `WHERE col != value` |

### 주의사항
1. **NULL은 특수 값**: 일반 비교 연산자 (`=`, `!=`)로 비교 불가
2. **타입 안전성**: UUID 컬럼에 문자열 `"null"` 전달 시 타입 에러
3. **Supabase API**: `.is()` 메서드로 NULL 비교 필수

---

## ✅ 최종 검증 체크리스트

### 사용자가 확인해야 할 사항:

- [ ] 개발 서버 재시작 완료
- [ ] "DB 배분" 버튼 클릭
- [ ] 성공 메시지 확인: "16개의 리드가 2명의 담당자에게 분배되었습니다."
- [ ] 페이지 자동 새로고침 (2초 후)
- [ ] DB 현황에서 `call_assigned_to` 컬럼에 담당자 이름 표시 확인
- [ ] 각 담당자에게 균등 분배 확인 (8개씩)

### SQL로 직접 확인 (선택사항):
```sql
-- 배정 결과 확인
SELECT
  call_assigned_to,
  u.full_name,
  COUNT(*) as assigned_count
FROM leads l
LEFT JOIN users u ON l.call_assigned_to = u.id
WHERE l.company_id = '971983c1-d197-4ee3-8cda-538551f2cfb2'
  AND l.call_assigned_to IS NOT NULL
GROUP BY call_assigned_to, u.full_name
ORDER BY assigned_count DESC;
```

**예상 결과**:
```
call_assigned_to                     | full_name  | assigned_count
-------------------------------------|------------|---------------
6e53371d-601f-48e6-8b72-5efc12581d46 | 최문호3    | 8
223abffa-cc9e-42f9-8ed1-c83155a4e46d | 추가테스트 | 8
```

---

## 📁 최종 수정 파일

**파일**: `/Users/mh.c/medisync/src/app/api/leads/distribute/route.ts`
**수정 라인**: 190
**수정 내용**: `.eq('call_assigned_to', null)` → `.is('call_assigned_to', null)`

---

## 🎉 해결 완료

**근본 원인**: Supabase에서 `.eq()` 메서드로 null 비교 시 문자열 "null"로 변환되어 UUID 타입 에러 발생

**해결 방법**: `.is()` 메서드 사용으로 올바른 `IS NULL` SQL 생성

**예상 결과**: 16개 리드가 2명의 담당자에게 정상 분배

**Next Action**: 사용자 테스트 및 성공 확인

---

**분석일**: 2025-12-25
**해결일**: 2025-12-25
**해결 방법**: Supabase Query API 수정
**테스트 상태**: 재테스트 대기
