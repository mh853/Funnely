'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ApiPlatform, MetaCredentials, KakaoCredentials, GoogleCredentials } from '@/types/database.types'

interface ApiCredential {
  id: string
  platform: ApiPlatform
  credentials: MetaCredentials | KakaoCredentials | GoogleCredentials
  is_active: boolean
  last_validated_at: string | null
  validation_error: string | null
}

export default function ApiCredentialsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hospitalId, setHospitalId] = useState<string | null>(null)

  // Credentials state
  const [metaCredentials, setMetaCredentials] = useState<MetaCredentials>({
    app_id: '',
    app_secret: '',
  })
  const [kakaoCredentials, setKakaoCredentials] = useState<KakaoCredentials>({
    rest_api_key: '',
    javascript_key: '',
  })
  const [googleCredentials, setGoogleCredentials] = useState<GoogleCredentials>({
    client_id: '',
    client_secret: '',
    developer_token: '',
  })

  // Status state
  const [metaStatus, setMetaStatus] = useState<{ exists: boolean; validated: boolean }>({ exists: false, validated: false })
  const [kakaoStatus, setKakaoStatus] = useState<{ exists: boolean; validated: boolean }>({ exists: false, validated: false })
  const [googleStatus, setGoogleStatus] = useState<{ exists: boolean; validated: boolean }>({ exists: false, validated: false })

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedPlatform, setExpandedPlatform] = useState<ApiPlatform | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadCredentials()
  }, [])

  async function loadCredentials() {
    try {
      setLoading(true)

      // Get user profile to find hospital_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('인증이 필요합니다.')
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('hospital_id, role')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        throw new Error('사용자 정보를 찾을 수 없습니다.')
      }

      setHospitalId(userProfile.hospital_id)

      // Load existing credentials
      const { data: credentials, error } = await supabase
        .from('api_credentials')
        .select('*')
        .eq('hospital_id', userProfile.hospital_id)

      if (error) throw error

      // Parse credentials for each platform
      credentials?.forEach((cred: any) => {
        const credData = cred.credentials as any

        if (cred.platform === 'meta') {
          setMetaCredentials(credData)
          setMetaStatus({ exists: true, validated: !!cred.last_validated_at })
        } else if (cred.platform === 'kakao') {
          setKakaoCredentials(credData)
          setKakaoStatus({ exists: true, validated: !!cred.last_validated_at })
        } else if (cred.platform === 'google') {
          setGoogleCredentials(credData)
          setGoogleStatus({ exists: true, validated: !!cred.last_validated_at })
        }
      })
    } catch (error: any) {
      console.error('Load credentials error:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function saveCredentials(platform: ApiPlatform) {
    if (!hospitalId) return

    try {
      setSaving(true)
      setMessage(null)

      let credentials: any
      if (platform === 'meta') {
        credentials = metaCredentials
      } else if (platform === 'kakao') {
        credentials = kakaoCredentials
      } else {
        credentials = googleCredentials
      }

      // Upsert credentials
      const { error } = await supabase
        .from('api_credentials')
        .upsert({
          hospital_id: hospitalId,
          platform,
          credentials,
          is_active: true,
        } as any, {
          onConflict: 'hospital_id,platform'
        })

      if (error) throw error

      setMessage({ type: 'success', text: `${platform.toUpperCase()} 인증 정보가 저장되었습니다.` })

      // Update status
      if (platform === 'meta') {
        setMetaStatus({ exists: true, validated: false })
      } else if (platform === 'kakao') {
        setKakaoStatus({ exists: true, validated: false })
      } else {
        setGoogleStatus({ exists: true, validated: false })
      }

      // Collapse the form
      setExpandedPlatform(null)
    } catch (error: any) {
      console.error('Save credentials error:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">광고 플랫폼 API 연동 설정</h1>
        <p className="mt-2 text-gray-600">
          Meta Ads, Kakao Moment, Google Ads와 연동하기 위한 API 인증 정보를 설정하세요.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Meta Ads */}
      <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
        <div
          className="p-6 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => setExpandedPlatform(expandedPlatform === 'meta' ? null : 'meta')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">M</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Meta Ads (Facebook/Instagram)</h2>
                <p className="text-sm text-gray-600">Facebook 및 Instagram 광고 관리</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {metaStatus.exists && (
                <span className={`px-3 py-1 rounded-full text-sm ${metaStatus.validated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {metaStatus.validated ? '✓ 연동됨' : '설정됨'}
                </span>
              )}
              <span className="text-gray-400">{expandedPlatform === 'meta' ? '▼' : '▶'}</span>
            </div>
          </div>
        </div>

        {expandedPlatform === 'meta' && (
          <div className="p-6 border-t bg-gray-50">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📚 설정 가이드</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li><a href="https://developers.facebook.com/" target="_blank" className="underline">Meta for Developers</a>에서 앱 생성</li>
                <li>Marketing API 제품 추가</li>
                <li>앱 ID와 앱 시크릿 복사</li>
                <li>리디렉션 URI 추가: <code className="bg-white px-2 py-1 rounded">https://yourdomain.com/auth/callback/meta</code></li>
              </ol>
              <a href="/docs/AD_PLATFORM_SETUP.md#meta-ads-설정" target="_blank" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                → 상세 설정 가이드 보기
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={metaCredentials.app_id}
                  onChange={(e) => setMetaCredentials({ ...metaCredentials, app_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123456789012345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Secret <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={metaCredentials.app_secret}
                  onChange={(e) => setMetaCredentials({ ...metaCredentials, app_secret: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••••••••••••••••••••••••••"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => saveCredentials('meta')}
                  disabled={saving || !metaCredentials.app_id || !metaCredentials.app_secret}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => setExpandedPlatform(null)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Kakao Moment */}
      <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
        <div
          className="p-6 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => setExpandedPlatform(expandedPlatform === 'kakao' ? null : 'kakao')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="text-gray-900 text-xl font-bold">K</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Kakao Moment</h2>
                <p className="text-sm text-gray-600">카카오톡 광고 관리</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {kakaoStatus.exists && (
                <span className={`px-3 py-1 rounded-full text-sm ${kakaoStatus.validated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {kakaoStatus.validated ? '✓ 연동됨' : '설정됨'}
                </span>
              )}
              <span className="text-gray-400">{expandedPlatform === 'kakao' ? '▼' : '▶'}</span>
            </div>
          </div>
        </div>

        {expandedPlatform === 'kakao' && (
          <div className="p-6 border-t bg-gray-50">
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">📚 설정 가이드</h3>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li><a href="https://developers.kakao.com/" target="_blank" className="underline">Kakao Developers</a>에서 애플리케이션 추가</li>
                <li>플랫폼 설정에서 Web 플랫폼 등록</li>
                <li>REST API 키와 JavaScript 키 복사</li>
                <li>Redirect URI 추가: <code className="bg-white px-2 py-1 rounded">https://yourdomain.com/auth/callback/kakao</code></li>
              </ol>
              <a href="/docs/AD_PLATFORM_SETUP.md#kakao-moment-설정" target="_blank" className="text-yellow-700 hover:underline text-sm mt-2 inline-block">
                → 상세 설정 가이드 보기
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  REST API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={kakaoCredentials.rest_api_key}
                  onChange={(e) => setKakaoCredentials({ ...kakaoCredentials, rest_api_key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="1234567890abcdef1234567890abcdef"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  JavaScript Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={kakaoCredentials.javascript_key}
                  onChange={(e) => setKakaoCredentials({ ...kakaoCredentials, javascript_key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="abcdef1234567890abcdef1234567890"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => saveCredentials('kakao')}
                  disabled={saving || !kakaoCredentials.rest_api_key || !kakaoCredentials.javascript_key}
                  className="px-6 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => setExpandedPlatform(null)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Google Ads */}
      <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
        <div
          className="p-6 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => setExpandedPlatform(expandedPlatform === 'google' ? null : 'google')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">G</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Google Ads</h2>
                <p className="text-sm text-gray-600">구글 검색 및 디스플레이 광고</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {googleStatus.exists && (
                <span className={`px-3 py-1 rounded-full text-sm ${googleStatus.validated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {googleStatus.validated ? '✓ 연동됨' : '설정됨'}
                </span>
              )}
              <span className="text-gray-400">{expandedPlatform === 'google' ? '▼' : '▶'}</span>
            </div>
          </div>
        </div>

        {expandedPlatform === 'google' && (
          <div className="p-6 border-t bg-gray-50">
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">📚 설정 가이드</h3>
              <ol className="text-sm text-red-800 space-y-1 list-decimal list-inside">
                <li><a href="https://console.cloud.google.com/" target="_blank" className="underline">Google Cloud Console</a>에서 프로젝트 생성</li>
                <li>Google Ads API 활성화</li>
                <li>OAuth 2.0 클라이언트 ID 생성</li>
                <li>Developer Token 신청</li>
                <li>리디렉션 URI 추가: <code className="bg-white px-2 py-1 rounded">https://yourdomain.com/auth/callback/google</code></li>
              </ol>
              <a href="/docs/AD_PLATFORM_SETUP.md#google-ads-설정" target="_blank" className="text-red-700 hover:underline text-sm mt-2 inline-block">
                → 상세 설정 가이드 보기
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={googleCredentials.client_id}
                  onChange={(e) => setGoogleCredentials({ ...googleCredentials, client_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="123456789012-abcdefghijklmnop.apps.googleusercontent.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={googleCredentials.client_secret}
                  onChange={(e) => setGoogleCredentials({ ...googleCredentials, client_secret: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="••••••••••••••••••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Developer Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={googleCredentials.developer_token}
                  onChange={(e) => setGoogleCredentials({ ...googleCredentials, developer_token: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="••••••••••••••••••••••••"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => saveCredentials('google')}
                  disabled={saving || !googleCredentials.client_id || !googleCredentials.client_secret || !googleCredentials.developer_token}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => setExpandedPlatform(null)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 도움말</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• API 인증 정보는 암호화되어 안전하게 저장됩니다.</li>
          <li>• 각 플랫폼의 개발자 콘솔에서 앱을 생성하고 API 키를 발급받아야 합니다.</li>
          <li>• 저장 후 광고 계정 연동 페이지에서 계정 연동을 진행할 수 있습니다.</li>
          <li>• 문제가 발생하면 <a href="/docs/AD_PLATFORM_SETUP.md" className="underline">상세 가이드</a>를 참고하세요.</li>
        </ul>
      </div>
    </div>
  )
}
