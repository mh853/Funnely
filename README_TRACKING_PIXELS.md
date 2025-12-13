# 🚨 랜딩페이지 404 오류 해결 방법

## 문제
- 공개 랜딩페이지 접속 시 404 오류 발생
- 원인: `tracking_pixels` 테이블이 데이터베이스에 존재하지 않음

## 해결 방법 (2분 소요)

### 1단계: Supabase Dashboard 접속
1. https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc 접속
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. **New query** 버튼 클릭

### 2단계: SQL 실행
아래 SQL 전체를 복사해서 붙여넣고 **Run** 버튼 클릭:

```sql
-- Create tracking_pixels table
CREATE TABLE IF NOT EXISTS tracking_pixels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  facebook_pixel_id VARCHAR(20),
  google_analytics_id VARCHAR(20),
  google_ads_id VARCHAR(20),
  kakao_pixel_id VARCHAR(20),
  naver_pixel_id VARCHAR(20),
  tiktok_pixel_id VARCHAR(30),
  karrot_pixel_id VARCHAR(30),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE tracking_pixels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company tracking pixels"
  ON tracking_pixels FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert their company tracking pixels"
  ON tracking_pixels FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company tracking pixels"
  ON tracking_pixels FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Update trigger
CREATE TRIGGER update_tracking_pixels_updated_at
  BEFORE UPDATE ON tracking_pixels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3단계: 확인
SQL Editor에서 다음 쿼리 실행:
```sql
SELECT * FROM tracking_pixels LIMIT 1;
```

오류 없이 실행되면 성공! ✅

### 4단계: 랜딩페이지 테스트
- http://localhost:3000/landing/test 접속
- 또는 https://funnely.kr/landing/{slug} 접속
- 404 오류 없이 정상 표시되어야 함

## 이후 픽셀 사용 방법

테이블 생성 후:
1. 대시보드 > 설정 > 픽셀 관리 메뉴로 이동
2. 각 광고 플랫폼의 픽셀 ID 입력
3. 저장하면 모든 랜딩페이지에 자동으로 적용됨

지원 플랫폼:
- Facebook Pixel
- Google Analytics 4
- Google Ads Conversion
- Kakao Pixel
- Naver Pixel
- TikTok Pixel
- 당근마켓 (Karrot Market) Pixel
