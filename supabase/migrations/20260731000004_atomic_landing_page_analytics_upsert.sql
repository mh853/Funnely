-- POST /api/landing-pages/view가 landing_page_analytics를 SELECT 후 별도의
-- INSERT/UPDATE로 나눠 처리해(non-atomic) 동시 방문이 몰리면 (1) UNIQUE(landing_page_id, date)
-- 위반으로 INSERT가 실패해 해당 조회가 완전히 누락되거나, (2) 이미 레코드가 있어도
-- read-modify-write 경쟁으로 UPDATE끼리 서로의 증가분을 덮어써 조용히 유실되는 문제가
-- 있었다(46차 QA에서 15개 동시요청 중 13건 유실을 라이브로 재현 확인). ON CONFLICT DO
-- UPDATE로 단일 원자적 문장에 합쳐 레이스를 제거한다.

CREATE OR REPLACE FUNCTION public.increment_landing_page_analytics(
  p_landing_page_id UUID,
  p_date DATE,
  p_device_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO landing_page_analytics (
    landing_page_id, date, page_views, desktop_views, mobile_views, tablet_views, unique_visitors
  )
  VALUES (
    p_landing_page_id,
    p_date,
    1,
    CASE WHEN p_device_type = 'desktop' THEN 1 ELSE 0 END,
    CASE WHEN p_device_type = 'mobile' THEN 1 ELSE 0 END,
    CASE WHEN p_device_type = 'tablet' THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (landing_page_id, date) DO UPDATE SET
    page_views = landing_page_analytics.page_views + 1,
    desktop_views = landing_page_analytics.desktop_views
      + CASE WHEN p_device_type = 'desktop' THEN 1 ELSE 0 END,
    mobile_views = landing_page_analytics.mobile_views
      + CASE WHEN p_device_type = 'mobile' THEN 1 ELSE 0 END,
    tablet_views = landing_page_analytics.tablet_views
      + CASE WHEN p_device_type = 'tablet' THEN 1 ELSE 0 END;
END;
$$;
