'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ApiPlatform, MetaCredentials, KakaoCredentials, GoogleCredentials } from '@/types/database.types'

interface PlatformState {
  credentials: MetaCredentials | KakaoCredentials | GoogleCredentials
  status: { exists: boolean; validated: boolean }
}

interface AppState {
  loading: boolean
  saving: boolean
  companyId: string | null
  message: { type: 'success' | 'error'; text: string } | null
  expandedPlatform: ApiPlatform | null
  platforms: {
    meta: PlatformState
    kakao: PlatformState
    google: PlatformState
  }
}

const initialState: AppState = {
  loading: true,
  saving: false,
  companyId: null,
  message: null,
  expandedPlatform: null,
  platforms: {
    meta: {
      credentials: { app_id: '', app_secret: '' },
      status: { exists: false, validated: false }
    },
    kakao: {
      credentials: { rest_api_key: '', javascript_key: '' },
      status: { exists: false, validated: false }
    },
    google: {
      credentials: { client_id: '', client_secret: '', developer_token: '' },
      status: { exists: false, validated: false }
    }
  }
}

export default function ApiCredentialsPage() {
  const [state, setState] = useState<AppState>(initialState)

  // Memoize Supabase client
  const supabase = useMemo(() => createClient(), [])

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const updatePlatformCredentials = useCallback((platform: ApiPlatform, credentials: any) => {
    setState(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: {
          ...prev.platforms[platform],
          credentials
        }
      }
    }))
  }, [])

  const loadCredentials = useCallback(async () => {
    try {
      updateState({ loading: true })

      // Get user profile (companyId만 필요 — 자격증명 자체는 서버 라우트에서
      // 복호화해 내려준다. 암호화 키는 서버 환경변수로만 존재하므로 클라이언트에서
      // 직접 복호화할 수 없다.)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다.')

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!userProfile) throw new Error('사용자 정보를 찾을 수 없습니다.')

      const response = await fetch('/api/settings/api-credentials')
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || '인증 정보를 불러오는데 실패했습니다.')
      }
      const { credentials } = await response.json()

      // Update state with loaded credentials
      const updates: Partial<AppState> = { companyId: userProfile.company_id }

      credentials?.forEach((cred: any) => {
        const platform = cred.platform as ApiPlatform
        if (!updates.platforms) updates.platforms = { ...state.platforms }

        updates.platforms[platform] = {
          credentials: cred.credentials,
          status: { exists: cred.exists, validated: cred.validated }
        }
      })

      updateState(updates)
    } catch (error: any) {
      console.error('Load credentials error:', error)
      updateState({ message: { type: 'error', text: error.message } })
    } finally {
      updateState({ loading: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, updateState])

  const saveCredentials = useCallback(async (platform: ApiPlatform) => {
    if (!state.companyId) return

    try {
      updateState({ saving: true, message: null })

      const credentials = state.platforms[platform].credentials

      const response = await fetch('/api/settings/api-credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, credentials }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || '저장에 실패했습니다.')
      }

      setState(prev => ({
        ...prev,
        message: { type: 'success', text: `${platform.toUpperCase()} 인증 정보가 저장되었습니다.` },
        expandedPlatform: null,
        platforms: {
          ...prev.platforms,
          [platform]: {
            ...prev.platforms[platform],
            status: { exists: true, validated: false }
          }
        }
      }))
    } catch (error: any) {
      console.error('Save credentials error:', error)
      updateState({ message: { type: 'error', text: error.message } })
    } finally {
      updateState({ saving: false })
    }
  }, [state.companyId, state.platforms, supabase, updateState])

  useEffect(() => {
    loadCredentials()
  }, [loadCredentials])

  // Auto-hide success messages
  useEffect(() => {
    if (state.message?.type === 'success') {
      const timer = setTimeout(() => {
        updateState({ message: null })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state.message, updateState])

  if (state.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  const { meta, kakao, google } = state.platforms

  return (
    <div className="px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">광고 플랫폼 API 연동 설정</h1>
            <p className="text-xs text-gray-500 mt-0.5">각 광고 플랫폼의 API 인증 정보를 안전하게 관리합니다</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {state.message && (
        <div className={`mb-6 p-4 rounded-lg ${
          state.message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {state.message.text}
        </div>
      )}

      {/* Meta Ads */}
      <PlatformCard
        platform="meta"
        title="Meta Ads (Facebook & Instagram)"
        color="blue"
        guideLink="/guides/meta-ads"
        credentials={meta.credentials as MetaCredentials}
        status={meta.status}
        expanded={state.expandedPlatform === 'meta'}
        saving={state.saving}
        onToggle={() => updateState({ expandedPlatform: state.expandedPlatform === 'meta' ? null : 'meta' })}
        onUpdate={(creds) => updatePlatformCredentials('meta', creds)}
        onSave={() => saveCredentials('meta')}
      />

      {/* Kakao Moment */}
      <PlatformCard
        platform="kakao"
        title="Kakao Moment"
        color="yellow"
        guideLink="/guides/kakao-moment"
        credentials={kakao.credentials as KakaoCredentials}
        status={kakao.status}
        expanded={state.expandedPlatform === 'kakao'}
        saving={state.saving}
        onToggle={() => updateState({ expandedPlatform: state.expandedPlatform === 'kakao' ? null : 'kakao' })}
        onUpdate={(creds) => updatePlatformCredentials('kakao', creds)}
        onSave={() => saveCredentials('kakao')}
      />

      {/* Google Ads */}
      <PlatformCard
        platform="google"
        title="Google Ads"
        color="red"
        guideLink="/guides/google-ads"
        credentials={google.credentials as GoogleCredentials}
        status={google.status}
        expanded={state.expandedPlatform === 'google'}
        saving={state.saving}
        onToggle={() => updateState({ expandedPlatform: state.expandedPlatform === 'google' ? null : 'google' })}
        onUpdate={(creds) => updatePlatformCredentials('google', creds)}
        onSave={() => saveCredentials('google')}
      />

      {/* Help Section */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 도움말</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• API 인증 정보는 암호화되어 안전하게 저장됩니다.</li>
          <li>• 각 플랫폼의 개발자 콘솔에서 앱을 생성하고 API 키를 발급받아야 합니다.</li>
          <li>• 저장 후 광고 계정 연동 페이지에서 계정 연동을 진행할 수 있습니다.</li>
          <li>• 문제가 발생하면 각 플랫폼의 상세 가이드 (<Link href="/guides/meta-ads" className="underline">Meta</Link>, <Link href="/guides/kakao-moment" className="underline">Kakao</Link>, <Link href="/guides/google-ads" className="underline">Google</Link>)를 참고하세요.</li>
        </ul>
      </div>
    </div>
  )
}

// Memoized Platform Card Component
interface PlatformCardProps {
  platform: ApiPlatform
  title: string
  color: 'blue' | 'yellow' | 'red'
  guideLink: string
  credentials: MetaCredentials | KakaoCredentials | GoogleCredentials
  status: { exists: boolean; validated: boolean }
  expanded: boolean
  saving: boolean
  onToggle: () => void
  onUpdate: (credentials: any) => void
  onSave: () => void
}

const PlatformCard = React.memo(({
  platform,
  title,
  color,
  guideLink,
  credentials,
  status,
  expanded,
  saving,
  onToggle,
  onUpdate,
  onSave
}: PlatformCardProps) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: 'bg-blue-600',
      iconText: 'text-white',
      guide: 'text-blue-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      button: 'bg-yellow-400 hover:bg-yellow-500',
      icon: 'bg-yellow-400',
      iconText: 'text-gray-900',
      guide: 'text-yellow-700'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      button: 'bg-red-600 hover:bg-red-700',
      icon: 'bg-red-600',
      iconText: 'text-white',
      guide: 'text-red-700'
    }
  }

  const colors = colorClasses[color]
  const statusText = status.validated ? '✓ 연동됨' : status.exists ? '설정됨' : '미설정'
  const statusColor = status.validated ? 'text-green-600' : status.exists ? 'text-blue-600' : 'text-gray-400'

  return (
    <div className={`mb-4 border ${colors.border} rounded-lg overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full p-4 ${colors.bg} flex items-center justify-between hover:opacity-90 transition`}
      >
        <div className="flex items-center space-x-3">
          <div className={`h-10 w-10 ${colors.icon} rounded-lg flex items-center justify-center`}>
            <span className={`font-bold text-xl ${colors.iconText}`}>
              {platform === 'meta' ? 'f' : platform === 'kakao' ? 'K' : 'G'}
            </span>
          </div>
          <div className="text-left">
            <h3 className={`font-semibold ${colors.text}`}>{title}</h3>
            <p className={`text-sm ${statusColor}`}>{statusText}</p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 ${colors.text} transform transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-4 bg-white">
          {platform === 'meta' && (
            <MetaForm
              credentials={credentials as MetaCredentials}
              onChange={onUpdate}
              onSave={onSave}
              saving={saving}
              guideLink={guideLink}
              colors={colors}
            />
          )}
          {platform === 'kakao' && (
            <KakaoForm
              credentials={credentials as KakaoCredentials}
              onChange={onUpdate}
              onSave={onSave}
              saving={saving}
              guideLink={guideLink}
              colors={colors}
            />
          )}
          {platform === 'google' && (
            <GoogleForm
              credentials={credentials as GoogleCredentials}
              onChange={onUpdate}
              onSave={onSave}
              saving={saving}
              guideLink={guideLink}
              colors={colors}
            />
          )}
        </div>
      )}
    </div>
  )
})

PlatformCard.displayName = 'PlatformCard'

// Form Components
const MetaForm = React.memo(({ credentials, onChange, onSave, saving, guideLink, colors }: any) => (
  <div>
    <div className={`mb-4 p-4 ${colors.bg} border ${colors.border} rounded-lg`}>
      <h3 className={`font-semibold ${colors.text} mb-2`}>📚 설정 가이드</h3>
      <ol className={`text-sm ${colors.text} space-y-1 list-decimal list-inside`}>
        <li><a href="https://developers.facebook.com/" target="_blank" className="underline">Meta for Developers</a>에서 앱 생성</li>
        <li>Marketing API 제품 추가</li>
        <li>앱 ID와 앱 시크릿 복사</li>
        <li>리디렉션 URI 추가: <code className="bg-white px-2 py-1 rounded">https://yourdomain.com/auth/callback/meta</code></li>
      </ol>
      <Link href={guideLink} target="_blank" className={`${colors.guide} hover:underline text-sm mt-2 inline-block`}>
        → 상세 설정 가이드 보기
      </Link>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          App ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={credentials.app_id}
          onChange={(e) => onChange({ ...credentials, app_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="123456789012345"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          App Secret <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={credentials.app_secret}
          onChange={(e) => onChange({ ...credentials, app_secret: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••••••••••"
        />
      </div>
      <button
        onClick={onSave}
        disabled={saving || !credentials.app_id || !credentials.app_secret}
        className={`w-full ${colors.button} text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition`}
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  </div>
))

MetaForm.displayName = 'MetaForm'

const KakaoForm = React.memo(({ credentials, onChange, onSave, saving, guideLink, colors }: any) => (
  <div>
    <div className={`mb-4 p-4 ${colors.bg} border ${colors.border} rounded-lg`}>
      <h3 className={`font-semibold ${colors.text} mb-2`}>📚 설정 가이드</h3>
      <ol className={`text-sm ${colors.text} space-y-1 list-decimal list-inside`}>
        <li><a href="https://developers.kakao.com/" target="_blank" className="underline">Kakao Developers</a>에서 애플리케이션 추가</li>
        <li>플랫폼 설정에서 Web 플랫폼 등록</li>
        <li>REST API 키와 JavaScript 키 복사</li>
        <li>Redirect URI 추가: <code className="bg-white px-2 py-1 rounded">https://yourdomain.com/auth/callback/kakao</code></li>
      </ol>
      <Link href={guideLink} target="_blank" className={`${colors.guide} hover:underline text-sm mt-2 inline-block`}>
        → 상세 설정 가이드 보기
      </Link>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          REST API Key <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={credentials.rest_api_key}
          onChange={(e) => onChange({ ...credentials, rest_api_key: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder="abc123def456..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          JavaScript Key <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={credentials.javascript_key}
          onChange={(e) => onChange({ ...credentials, javascript_key: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder="xyz789ghi012..."
        />
      </div>
      <button
        onClick={onSave}
        disabled={saving || !credentials.rest_api_key || !credentials.javascript_key}
        className={`w-full ${colors.button} ${colors.iconText} px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition font-medium`}
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  </div>
))

KakaoForm.displayName = 'KakaoForm'

const GoogleForm = React.memo(({ credentials, onChange, onSave, saving, guideLink, colors }: any) => (
  <div>
    <div className={`mb-4 p-4 ${colors.bg} border ${colors.border} rounded-lg`}>
      <h3 className={`font-semibold ${colors.text} mb-2`}>📚 설정 가이드</h3>
      <ol className={`text-sm ${colors.text} space-y-1 list-decimal list-inside`}>
        <li><a href="https://console.cloud.google.com/" target="_blank" className="underline">Google Cloud Console</a>에서 프로젝트 생성</li>
        <li>Google Ads API 활성화</li>
        <li>OAuth 2.0 클라이언트 ID 생성</li>
        <li>Developer Token 신청</li>
        <li>리디렉션 URI 추가: <code className="bg-white px-2 py-1 rounded">https://yourdomain.com/auth/callback/google</code></li>
      </ol>
      <Link href={guideLink} target="_blank" className={`${colors.guide} hover:underline text-sm mt-2 inline-block`}>
        → 상세 설정 가이드 보기
      </Link>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={credentials.client_id}
          onChange={(e) => onChange({ ...credentials, client_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="123456789012-abc..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client Secret <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={credentials.client_secret}
          onChange={(e) => onChange({ ...credentials, client_secret: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="••••••••••••••••"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Developer Token <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={credentials.developer_token}
          onChange={(e) => onChange({ ...credentials, developer_token: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="••••••••••••••••"
        />
      </div>
      <button
        onClick={onSave}
        disabled={saving || !credentials.client_id || !credentials.client_secret || !credentials.developer_token}
        className={`w-full ${colors.button} text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition`}
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  </div>
))

GoogleForm.displayName = 'GoogleForm'
