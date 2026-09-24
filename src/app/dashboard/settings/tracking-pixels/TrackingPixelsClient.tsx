'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackingPixels } from '@/types/landing-page.types'
import { useToast } from '@/components/shared/Toast'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { isValidPixelId } from '@/lib/utils/tracking-pixels'

interface TrackingPixelsClientProps {
  companyId: string
  initialData: TrackingPixels | null
  canEdit: boolean
}

export default function TrackingPixelsClient({
  companyId,
  initialData,
  canEdit,
}: TrackingPixelsClientProps) {
  const supabase = createClient()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form state
  const [facebookPixelId, setFacebookPixelId] = useState(initialData?.facebook_pixel_id || '')
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(initialData?.google_analytics_id || '')
  const [googleAdsId, setGoogleAdsId] = useState(initialData?.google_ads_id || '')
  const [googleAdsLabel, setGoogleAdsLabel] = useState(initialData?.google_ads_conversion_label || '')
  const [kakaoPixelId, setKakaoPixelId] = useState(initialData?.kakao_pixel_id || '')
  const [naverPixelId, setNaverPixelId] = useState(initialData?.naver_pixel_id || '')
  const [tiktokPixelId, setTiktokPixelId] = useState(initialData?.tiktok_pixel_id || '')
  const [karrotPixelId, setKarrotPixelId] = useState(initialData?.karrot_pixel_id || '')
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)

  const handleSave = async () => {
    if (!canEdit) return

    // 픽셀 ID는 랜딩페이지에서 <script> 안에 그대로 문자열 보간되므로, 저장 시점에
    // 형식을 검증해 따옴표/꺾쇠괄호 등 안전하지 않은 문자가 섞이지 않도록 막는다
    // (렌더링 쪽에도 동일한 화이트리스트 검증이 있지만, 잘못된 값을 애초에 저장하지
    // 않도록 여기서도 막아 사용자에게 즉시 피드백을 준다).
    // 복사-붙여넣기로 앞뒤 공백이 섞이면 화이트리스트에 걸려 원인을 알기 어려우므로 먼저 다듬는다.
    // 어떤 칸이 잘못됐는지 바로 보이도록 토스트 하나 대신 칸마다 오류를 표시한다.
    const values: Record<string, string> = {
      facebook_pixel_id: facebookPixelId.trim(),
      google_analytics_id: googleAnalyticsId.trim(),
      google_ads_id: googleAdsId.trim(),
      google_ads_conversion_label: googleAdsLabel.trim(),
      kakao_pixel_id: kakaoPixelId.trim(),
      naver_pixel_id: naverPixelId.trim(),
      tiktok_pixel_id: tiktokPixelId.trim(),
      karrot_pixel_id: karrotPixelId.trim(),
    }
    const errors: Record<string, string> = {}
    for (const [key, value] of Object.entries(values)) {
      if (value && !isValidPixelId(value)) {
        errors[key] = '영문자, 숫자, 하이픈(-), 언더스코어(_)만 입력할 수 있습니다.'
      }
    }
    if (values.google_analytics_id.toUpperCase().startsWith('AW-')) {
      errors.google_analytics_id = 'AW-로 시작하는 값은 구글 애즈 ID입니다. 아래 Google Ads 칸에 입력해주세요.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error('입력값을 확인해주세요.')
      return
    }

    setSaving(true)

    try {
      const pixelData = {
        company_id: companyId,
        ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value || null])),
        is_active: isActive,
      }

      // 회사당 1행(UNIQUE company_id)이라 upsert 하나로 첫 저장/수정을 모두 처리한다.
      const { data: saved, error } = await supabase
        .from('tracking_pixels')
        .upsert(pixelData as any, { onConflict: 'company_id' })
        .select('company_id')

      if (error) throw error
      if (!saved || saved.length === 0) throw new Error('저장 권한이 없습니다.')

      toast.success('픽셀 설정이 저장되었습니다!')
    } catch (error) {
      console.error('Error saving tracking pixels:', error)
      toast.error('픽셀 설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Permission Warning */}
      {!canEdit && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-6 mt-6 rounded">
          <p className="text-sm text-yellow-700">
            픽셀 설정을 수정하려면 관리자 권한이 필요합니다.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mt-6 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">픽셀 설정 안내</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p>• 여기서 설정한 픽셀 ID는 모든 활성화된 랜딩페이지에 자동으로 적용됩니다</p>
              <p>• 픽셀 ID는 각 광고 플랫폼의 관리자 페이지에서 확인할 수 있습니다</p>
              <p>• 비활성화하면 픽셀 추적이 중단됩니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-6 space-y-6">
        {/* Facebook Pixel */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <label className="block text-sm font-medium text-gray-700">
              Facebook Pixel ID
            </label>
          </div>
          <input
            type="text"
            value={facebookPixelId}
            onChange={(e) => setFacebookPixelId(e.target.value)}
            placeholder="예: 123456789012345"
            maxLength={64}
            readOnly={!canEdit}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-gray-50 read-only:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Meta 이벤트 관리자 {'>'} 데이터 소스 {'>'} 픽셀에서 확인
          </p>
          <FieldError message={fieldErrors.facebook_pixel_id} />
        </div>

        {/* Google Analytics */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <label className="block text-sm font-medium text-gray-700">
              Google Analytics 4 ID
            </label>
          </div>
          <input
            type="text"
            value={googleAnalyticsId}
            onChange={(e) => setGoogleAnalyticsId(e.target.value)}
            placeholder="예: G-XXXXXXXXXX"
            maxLength={64}
            readOnly={!canEdit}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-gray-50 read-only:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Google Analytics {'>'} 관리 {'>'} 데이터 스트림에서 확인
          </p>
          <FieldError message={fieldErrors.google_analytics_id} />
          {!fieldErrors.google_analytics_id && googleAnalyticsId.trim().toUpperCase().startsWith('AW-') && (
            <p className="mt-1 text-xs text-amber-600">
              AW-로 시작하는 값은 구글 애즈 ID입니다. 아래 Google Ads 칸에 입력해주세요.
            </p>
          )}
        </div>

        {/* Google Ads */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <label className="block text-sm font-medium text-gray-700">
              Google Ads Conversion ID
            </label>
          </div>
          <input
            type="text"
            value={googleAdsId}
            onChange={(e) => {
              // 구글 애즈 태그의 send_to 값(`AW-ID/라벨`)을 통째로 붙여넣으면 ID와 라벨로 나눠 담는다.
              const [id, label] = e.target.value.split('/')
              setGoogleAdsId(id)
              if (label !== undefined) setGoogleAdsLabel(label)
            }}
            placeholder="예: AW-123456789"
            maxLength={64}
            readOnly={!canEdit}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-gray-50 read-only:text-gray-500"
          />
          <FieldError message={fieldErrors.google_ads_id} />
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-2">
            전환 라벨
          </label>
          <input
            type="text"
            value={googleAdsLabel}
            onChange={(e) => setGoogleAdsLabel(e.target.value)}
            placeholder="예: AbC-D_efG-h12_34-567"
            maxLength={64}
            readOnly={!canEdit}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-gray-50 read-only:text-gray-500"
          />
          <FieldError message={fieldErrors.google_ads_conversion_label} />
          <p className="mt-1 text-xs text-gray-500">
            Google Ads {'>'} 목표 {'>'} 전환 {'>'} 전환 액션 {'>'} 태그 설정의 send_to 값(AW-ID/라벨)을 ID 칸에 붙여넣으면 자동으로 나눠집니다
          </p>
          {googleAdsId.trim() && !googleAdsLabel.trim() && (
            <p className="mt-1 text-xs text-amber-600">
              전환 라벨이 없으면 신청 완료 전환이 구글 애즈에 집계되지 않습니다
            </p>
          )}
        </div>

        {/* Kakao Pixel */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
            </svg>
            <label className="block text-sm font-medium text-gray-700">
              Kakao Pixel ID
            </label>
          </div>
          <input
            type="text"
            value={kakaoPixelId}
            onChange={(e) => setKakaoPixelId(e.target.value)}
            placeholder="예: 1234567890"
            maxLength={64}
            readOnly={!canEdit}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-gray-50 read-only:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Kakao Moment {'>'} 픽셀 관리에서 확인
          </p>
          <FieldError message={fieldErrors.kakao_pixel_id} />
        </div>

        {/* Naver Pixel */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
            </svg>
            <label className="block text-sm font-medium text-gray-700">
              Naver Pixel ID
            </label>
          </div>
          <input
            type="text"
            value={naverPixelId}
            onChange={(e) => setNaverPixelId(e.target.value)}
            placeholder="예: s_123abc"
            maxLength={64}
            readOnly={!canEdit}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-gray-50 read-only:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            네이버 검색광고 {'>'} 도구 {'>'} 전환추적에서 확인 (s_로 시작하는 공통 인증키)
          </p>
          <FieldError message={fieldErrors.naver_pixel_id} />
        </div>

        {/* TikTok Pixel */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
            </svg>
            <label className="block text-sm font-medium text-gray-700">
              TikTok Pixel ID
            </label>
          </div>
          <input
            type="text"
            value={tiktokPixelId}
            onChange={(e) => setTiktokPixelId(e.target.value)}
            placeholder="예: C1234ABCD5EFGH67IJKL"
            maxLength={64}
            readOnly={!canEdit}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-gray-50 read-only:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            TikTok Ads Manager {'>'} Assets {'>'} Events에서 확인
          </p>
          <FieldError message={fieldErrors.tiktok_pixel_id} />
        </div>

        {/* Karrot Market Pixel */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            <label className="block text-sm font-medium text-gray-700">
              당근마켓 Pixel ID
            </label>
          </div>
          <input
            type="text"
            value={karrotPixelId}
            onChange={(e) => setKarrotPixelId(e.target.value)}
            placeholder="예: karrot_12345"
            maxLength={64}
            readOnly={!canEdit}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent read-only:bg-gray-50 read-only:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            당근마켓 비즈니스 {'>'} 광고 관리 {'>'} 전환 추적에서 확인
          </p>
          <FieldError message={fieldErrors.karrot_pixel_id} />
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            <label className="text-sm font-medium text-gray-700">픽셀 추적 활성화</label>
            <p className="text-xs text-gray-500 mt-1">
              비활성화하면 모든 픽셀 추적이 중단됩니다
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            disabled={!canEdit}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="px-6 pb-6">
        <button
          onClick={handleSave}
          disabled={saving || !canEdit}
          className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              저장 중...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5" />
              저장하기
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}
