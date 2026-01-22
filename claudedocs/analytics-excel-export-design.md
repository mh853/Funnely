# Analytics 페이지 엑셀 다운로드 기능 설계

## 1. 개요

dashboard/analytics 페이지에 엑셀 다운로드 기능을 추가합니다. DB리포트 페이지의 엑셀 다운로드 기능을 참고하여 동일한 패턴과 날짜 형식을 사용합니다.

## 2. 다운로드 대상 데이터

### 2.1 트래픽 유입 데이터 (Traffic Data)
- 날짜별 페이지뷰 데이터
- PC/Mobile/Tablet 디바이스별 분류
- 합계 포함

### 2.2 DB 전환수 데이터 (Conversion Data)
- 날짜별 DB 전환 데이터
- PC/Mobile/Tablet 디바이스별 분류
- 전환율(%) 포함
- 합계 포함

### 2.3 랜딩페이지 분석 데이터 (Landing Page Analysis)
- 랜딩페이지별 트래픽 및 전환 데이터
- 생성 날짜, 이름, 트래픽, 전환수, 전환율
- PC/Mobile/Tablet 디바이스별 분류
- 합계 포함

### 2.4 UTM 분석 데이터 (UTM Analysis)
- UTM Source, Medium, Campaign, Content, Term
- 각 UTM 파라미터별 카운트 및 비율
- Top 10 항목만 포함

## 3. CSV 파일 구조

### 3.1 트래픽 유입 CSV (traffic_YYYY년MM월.csv)

```csv
날짜,합계,PC,PC(%),MOBILE,MOBILE(%),TABLET,TABLET(%)
2026-01-01,100,40,40.0,50,50.0,10,10.0
2026-01-02,150,60,40.0,75,50.0,15,10.0
...
합계,250,100,40,125,50,25,10
```

### 3.2 DB 전환수 CSV (conversion_YYYY년MM월.csv)

```csv
날짜,합계,전환율(%),PC,PC전환율(%),MOBILE,MOBILE전환율(%),TABLET,TABLET전환율(%)
2026-01-01,10,10.0,4,10.0,5,10.0,1,10.0
2026-01-02,15,10.0,6,10.0,7,9.3,2,13.3
...
합계,25,10.0,10,10.0,12,9.6,3,12.0
```

### 3.3 랜딩페이지 분석 CSV (landing_pages_YYYY년MM월.csv)

```csv
생성날짜,랜딩페이지이름,트래픽합계,PC,PC(%),MOBILE,MOBILE(%),TABLET,TABLET(%),전환수,전환율(%),PC전환,PC(%),MOBILE전환,MOBILE(%),TABLET전환,TABLET(%)
2026-01-15,프로모션A,100,40,40.0,50,50.0,10,10.0,10,10.0,4,40.0,5,50.0,1,10.0
2026-01-20,프로모션B,150,60,40.0,75,50.0,15,10.0,15,10.0,6,40.0,7,46.7,2,13.3
...
합계,,250,100,40.0,125,50.0,25,10.0,25,10.0,10,40.0,12,48.0,3,12.0
```

### 3.4 UTM 분석 CSV (utm_analysis_YYYY년MM월.csv)

```csv
UTM구분,항목,카운트,비율(%)
Source,google,100,40.0
Source,naver,80,32.0
Source,kakao,70,28.0
Medium,cpc,120,48.0
Medium,organic,80,32.0
Medium,social,50,20.0
Campaign,spring_promotion,100,40.0
...
```

## 4. 구현 사항

### 4.1 UI 변경사항

**엑셀 다운로드 버튼 추가 위치:**
- 각 섹션 헤더에 다운로드 버튼 추가
- 아이콘: HeroIcons의 ArrowDownTrayIcon 사용
- 위치: 헤더 우측 상단

**버튼 레이아웃:**
```tsx
<div className="flex items-center justify-between">
  <h2>섹션 제목</h2>
  <button onClick={handleExport} className="...">
    <ArrowDownTrayIcon className="h-4 w-4" />
    엑셀 다운로드
  </button>
</div>
```

### 4.2 다운로드 함수 구현

**ReportsClient.tsx의 패턴을 따름:**

```typescript
const handleExportTraffic = () => {
  const headers = ['날짜', '합계', 'PC', 'PC(%)', 'MOBILE', 'MOBILE(%)', 'TABLET', 'TABLET(%)']

  const rows = sortedTrafficRows.map(row => [
    formatDate(row.date),
    row.total,
    row.pc,
    row.total > 0 ? ((row.pc / row.total) * 100).toFixed(1) : '0.0',
    row.mobile,
    row.total > 0 ? ((row.mobile / row.total) * 100).toFixed(1) : '0.0',
    row.tablet,
    row.total > 0 ? ((row.tablet / row.total) * 100).toFixed(1) : '0.0',
  ])

  // 합계 행 추가
  rows.push([
    '합계',
    trafficTotals.total,
    trafficTotals.pc,
    trafficTotals.total > 0 ? ((trafficTotals.pc / trafficTotals.total) * 100).toFixed(1) : '0.0',
    trafficTotals.mobile,
    trafficTotals.total > 0 ? ((trafficTotals.mobile / trafficTotals.total) * 100).toFixed(1) : '0.0',
    trafficTotals.tablet,
    trafficTotals.total > 0 ? ((trafficTotals.tablet / trafficTotals.total) * 100).toFixed(1) : '0.0',
  ])

  const csvContent =
    '\uFEFF' +
    [
      headers.map(escapeCSV).join(','),
      ...rows.map(r => r.map(escapeCSV).join(','))
    ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `traffic_${selectedYear}년${selectedMonth}월.csv`
  link.click()
  URL.revokeObjectURL(url)
}
```

### 4.3 유틸리티 함수

**ReportsClient.tsx에서 가져올 함수들:**

```typescript
// 날짜 형식 변환 함수
const formatDate = (dateStr: string): string => {
  // yyyy-mm-dd 형식 유지
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  return dateStr
}

// CSV 이스케이프 함수
const escapeCSV = (value: any): string => {
  const strValue = String(value)
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`
  }
  return strValue
}
```

## 5. 다운로드 버튼 배치

### 5.1 트래픽 유입 테이블
- 위치: 테이블 헤더 우측
- 파일명: `traffic_YYYY년MM월.csv`

### 5.2 DB 전환수 테이블
- 위치: 테이블 헤더 우측
- 파일명: `conversion_YYYY년MM월.csv`

### 5.3 랜딩페이지 분석 테이블
- 위치: 테이블 헤더 우측
- 파일명: `landing_pages_YYYY년MM월.csv`

### 5.4 UTM 분석 섹션
- 위치: 섹션 헤더 우측
- 파일명: `utm_analysis_YYYY년MM월.csv`

## 6. 데이터 처리 로직

### 6.1 전환율 계산
- 전환율 = (전환수 / 트래픽) * 100
- 소수점 첫째 자리까지 표시 (toFixed(1))
- 트래픽이 0인 경우 '0.0%'

### 6.2 디바이스 비율 계산
- 디바이스 비율 = (디바이스 카운트 / 전체 카운트) * 100
- 소수점 첫째 자리까지 표시 (toFixed(1))
- 전체 카운트가 0인 경우 '0.0%'

### 6.3 날짜 형식
- DB리포트와 동일한 형식 사용
- yyyy-mm-dd 형식 유지
- formatDate() 함수 사용

### 6.4 CSV 인코딩
- UTF-8 BOM (\uFEFF) 추가
- 엑셀에서 한글이 깨지지 않도록 보장

## 7. 구현 순서

1. **유틸리티 함수 추가**
   - formatDate() 함수 추가
   - escapeCSV() 함수 추가

2. **트래픽 다운로드 함수 구현**
   - handleExportTraffic() 함수 작성
   - 트래픽 테이블에 다운로드 버튼 추가

3. **전환수 다운로드 함수 구현**
   - handleExportConversion() 함수 작성
   - 전환수 테이블에 다운로드 버튼 추가

4. **랜딩페이지 분석 다운로드 함수 구현**
   - handleExportLandingPages() 함수 작성
   - 랜딩페이지 분석 테이블에 다운로드 버튼 추가

5. **UTM 분석 다운로드 함수 구현**
   - handleExportUtm() 함수 작성
   - UTM 분석 섹션에 다운로드 버튼 추가

6. **아이콘 import**
   - ArrowDownTrayIcon import 추가

## 8. 테스트 시나리오

### 8.1 기본 다운로드 테스트
- [ ] 각 섹션의 다운로드 버튼 클릭
- [ ] CSV 파일 생성 확인
- [ ] 파일명이 올바른 형식인지 확인

### 8.2 데이터 정합성 테스트
- [ ] 다운로드된 데이터와 화면 데이터 일치 확인
- [ ] 합계 행이 정확히 계산되었는지 확인
- [ ] 퍼센트 값이 올바르게 계산되었는지 확인

### 8.3 엑셀 호환성 테스트
- [ ] Excel에서 파일 열기
- [ ] 한글 인코딩 정상 확인
- [ ] 숫자 값이 텍스트가 아닌 숫자로 인식되는지 확인
- [ ] 콤마가 포함된 값이 올바르게 처리되는지 확인

### 8.4 엣지 케이스 테스트
- [ ] 데이터가 없는 경우 (빈 테이블)
- [ ] 트래픽은 있지만 전환이 없는 경우 (전환율 0%)
- [ ] 특수문자가 포함된 랜딩페이지 이름
- [ ] UTM 파라미터에 쌍따옴표나 콤마가 포함된 경우

## 9. 코드 재사용

ReportsClient.tsx에서 다음 코드를 참고:
- formatDate() 함수 (Line 195-206)
- escapeCSV() 함수 (Line 214-221)
- CSV 생성 로직 (Line 350-363)
- 파일 다운로드 로직 (Line 357-363)

## 10. 주의사항

1. **날짜 형식 일관성**: DB리포트와 동일한 형식(yyyy-mm-dd) 사용
2. **CSV 표준 준수**: escapeCSV로 모든 값 처리
3. **UTF-8 BOM**: 엑셀 한글 호환성을 위해 \uFEFF 추가
4. **퍼센트 형식**: 소수점 첫째 자리까지 표시 (예: 40.0%)
5. **합계 행**: 모든 테이블에 합계 행 포함
6. **파일명 형식**: `[데이터타입]_YYYY년MM월.csv` 형식 사용
