'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackingPixels } from '@/types/landing-page.types'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

interface TrackingPixelsClientProps {
  companyId: string
  initialData: TrackingPixels | null
}

export default function TrackingPixelsClient({
  companyId,
  initialData,
}: TrackingPixelsClientProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Form state
  const [facebookPixelId, setFacebookPixelId] = useState(initialData?.facebook_pixel_id || '')
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(initialData?.google_analytics_id || '')
  const [googleAdsId, setGoogleAdsId] = useState(initialData?.google_ads_id || '')
  const [kakaoPixelId, setKakaoPixelId] = useState(initialData?.kakao_pixel_id || '')
  const [naverPixelId, setNaverPixelId] = useState(initialData?.naver_pixel_id || '')
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)

    try {
      const pixelData = {
        company_id: companyId,
        facebook_pixel_id: facebookPixelId || null,
        google_analytics_id: googleAnalyticsId || null,
        google_ads_id: googleAdsId || null,
        kakao_pixel_id: kakaoPixelId || null,
        naver_pixel_id: naverPixelId || null,
        is_active: isActive,
      }

      if (initialData) {
        // Update existing record
        const { error } = await supabase
          .from('tracking_pixels')
          .update(pixelData)
          .eq('company_id', companyId)

        if (error) throw error
      } else {
        // Insert new record
        const { error } = await supabase
          .from('tracking_pixels')
          .insert([pixelData])

        if (error) throw error
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving tracking pixels:', error)
      alert('픽셀 설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mx-6 mt-6 rounded">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">
                픽셀 설정이 저장되었습니다!
              </p>
            </div>
          </div>
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
            maxLength={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Meta 이벤트 관리자 {'>'} 데이터 소스 {'>'} 픽셀에서 확인
          </p>
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
            maxLength={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Google Analytics {'>'} 관리 {'>'} 데이터 스트림에서 확인
          </p>
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
            onChange={(e) => setGoogleAdsId(e.target.value)}
            placeholder="예: AW-123456789"
            maxLength={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Google Ads {'>'} 도구 및 설정 {'>'} 전환에서 확인
          </p>
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
            maxLength={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Kakao Moment {'>'} 픽셀 관리에서 확인
          </p>
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
            maxLength={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            네이버 검색광고 {'>'} 도구 {'>'} 전환추적에서 확인
          </p>
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
          disabled={saving}
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
