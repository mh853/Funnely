# Tracking Pixels 테이블 생성 가이드

## 문제 상황
- 랜딩페이지 공개 URL 접속 시 404 오류 발생
- 원인: `tracking_pixels` 테이블이 존재하지 않아 쿼리 실패

## 해결 방법

### 1. Supabase Dashboard에서 SQL Editor 열기
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (wsrjfdnxsggwymlrfqcc)
3. 좌측 메뉴에서 "SQL Editor" 클릭
4. "New query" 버튼 클릭

### 2. 아래 SQL을 복사해서 실행

```sql
-- Create tracking_pixels table for centralized pixel management
CREATE TABLE IF NOT EXISTS tracking_pixels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Platform specific pixel IDs
  facebook_pixel_id VARCHAR(20),
  google_analytics_id VARCHAR(20),
  google_ads_id VARCHAR(20),
  kakao_pixel_id VARCHAR(20),
  naver_pixel_id VARCHAR(20),
  tiktok_pixel_id VARCHAR(30),
  karrot_pixel_id VARCHAR(30),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: one tracking pixel config per company
  UNIQUE(company_id)
);

-- Add comments
COMMENT ON TABLE tracking_pixels IS 'Centralized tracking pixel management for companies';
COMMENT ON COLUMN tracking_pixels.facebook_pixel_id IS 'Facebook/Meta Pixel ID';
COMMENT ON COLUMN tracking_pixels.google_analytics_id IS 'Google Analytics 4 Measurement ID (G-XXXXXXXXXX)';
COMMENT ON COLUMN tracking_pixels.google_ads_id IS 'Google Ads Conversion ID (AW-XXXXXXXXXX)';
COMMENT ON COLUMN tracking_pixels.kakao_pixel_id IS 'Kakao Pixel ID';
COMMENT ON COLUMN tracking_pixels.naver_pixel_id IS 'Naver Pixel ID';
COMMENT ON COLUMN tracking_pixels.tiktok_pixel_id IS 'TikTok Pixel ID';
COMMENT ON COLUMN tracking_pixels.karrot_pixel_id IS 'Karrot Market (당근마켓) Pixel ID';

-- Add RLS policies
ALTER TABLE tracking_pixels ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their company's tracking pixels
CREATE POLICY "Users can view their company tracking pixels"
  ON tracking_pixels
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert their company's tracking pixels
CREATE POLICY "Users can insert their company tracking pixels"
  ON tracking_pixels
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their company's tracking pixels
CREATE POLICY "Users can update their company tracking pixels"
  ON tracking_pixels
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_tracking_pixels_updated_at
  BEFORE UPDATE ON tracking_pixels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3. 실행 확인
"Run" 버튼을 클릭하여 실행하고 성공 메시지 확인

### 4. 테이블 생성 확인
```sql
SELECT * FROM tracking_pixels LIMIT 1;
```
이 쿼리가 오류 없이 실행되면 성공!

## 향후 사용 방법

### 픽셀 ID 설정하기
1. 퍼널리 대시보드 접속
2. 설정 > 픽셀 관리 메뉴로 이동
3. 각 광고 플랫폼의 픽셀 ID 입력
   - Facebook Pixel ID: Meta 이벤트 관리자에서 확인
   - Google Analytics 4 ID: GA4 관리 > 데이터 스트림에서 확인 (G-XXXXXXXXXX)
   - Google Ads Conversion ID: Google Ads > 도구 및 설정 > 전환에서 확인 (AW-XXXXXXXXXX)
   - Kakao Pixel ID: Kakao Moment > 픽셀 관리에서 확인
   - Naver Pixel ID: 네이버 검색광고 > 도구 > 전환추적에서 확인
   - TikTok Pixel ID: TikTok Ads Manager > Assets > Events에서 확인 (C1234ABCD5EFGH67IJKL)
   - Karrot Market Pixel ID: 당근마켓 비즈니스 > 광고 관리 > 전환 추적에서 확인 (karrot_12345)
4. "저장하기" 버튼 클릭

### 픽셀 작동 방식
- 설정한 픽셀 ID는 모든 활성화된 랜딩페이지에 자동으로 적용됩니다
- 랜딩페이지 방문 시 각 플랫폼의 픽셀 스크립트가 자동으로 로드됩니다
- `is_active = false`로 설정하면 모든 픽셀 추적이 중단됩니다

### 지원되는 픽셀 이벤트
현재 자동으로 추적되는 이벤트:
- **PageView**: 랜딩페이지 방문 (모든 플랫폼)
- 향후 추가 예정: Lead, Purchase, CompleteRegistration 등

## 기술 구조

### 데이터베이스 스키마
```
tracking_pixels
├─ id (UUID, Primary Key)
├─ company_id (UUID, Foreign Key → companies.id)
├─ facebook_pixel_id (VARCHAR(20), nullable)
├─ google_analytics_id (VARCHAR(20), nullable)
├─ google_ads_id (VARCHAR(20), nullable)
├─ kakao_pixel_id (VARCHAR(20), nullable)
├─ naver_pixel_id (VARCHAR(20), nullable)
├─ tiktok_pixel_id (VARCHAR(30), nullable)
├─ karrot_pixel_id (VARCHAR(30), nullable)
├─ is_active (BOOLEAN, default: true)
├─ created_at (TIMESTAMPTZ)
└─ updated_at (TIMESTAMPTZ)

Constraints:
- UNIQUE(company_id): 회사당 하나의 픽셀 설정만 허용
```

### 코드 통합
1. **설정 UI**: `/dashboard/settings/tracking-pixels`
   - TrackingPixelsClient.tsx: 픽셀 ID 입력 폼

2. **랜딩페이지 렌더링**: `/landing/[slug]`
   - page.tsx: tracking_pixels 데이터 조회
   - PublicLandingPage.tsx: 픽셀 스크립트 주입 (lines 320-416)

3. **픽셀 스크립트 로딩**:
   - Facebook Pixel: `fbq('init')`, `fbq('track', 'PageView')`
   - Google Analytics 4: `gtag('config')`
   - Google Ads: `gtag.js` 로드
   - Kakao Pixel: `kakaoPixel().pageView()`
   - Naver Pixel: `naver_pixel('track', 'PageView')`
   - TikTok Pixel: `ttq.load()`, `ttq.page()`
   - Karrot Market Pixel: `kpx('track', 'PageView')`

## 참고
- 마이그레이션 파일 위치:
  - `/supabase/migrations/20251212000000_add_facebook_pixel.sql` (기존 픽셀)
  - `/supabase/migrations/20251213000000_add_tiktok_karrot_pixels.sql` (TikTok, 당근마켓)
- 로컬 개발 시 Docker Desktop 필요 (supabase local development)
