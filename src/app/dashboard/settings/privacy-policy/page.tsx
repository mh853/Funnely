'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function PrivacyPolicyPage() {
  const router = useRouter()
  const supabase = createClient()

  const [privacyTitle, setPrivacyTitle] = useState('개인정보 수집·이용 동의')
  const [privacyContent, setPrivacyContent] = useState('')
  const [marketingTitle, setMarketingTitle] = useState('마케팅 활용 동의 (선택)')
  const [marketingContent, setMarketingContent] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    loadPrivacyPolicy()
  }, [])

  const loadPrivacyPolicy = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      if (!profile) return

      setCompanyId(profile.company_id)

      const { data: policy } = await supabase
        .from('privacy_policies')
        .select('*')
        .eq('company_id', profile.company_id)
        .single()

      if (policy) {
        setPrivacyTitle(policy.privacy_consent_title)
        setPrivacyContent(policy.privacy_consent_content)
        setMarketingTitle(policy.marketing_consent_title)
        setMarketingContent(policy.marketing_consent_content)
      } else {
        // 기본값 설정
        setPrivacyContent(`1. 수집 항목: 이름, 연락처
2. 수집 목적: 상담 및 서비스 제공
3. 보유 기간: 상담 완료 후 3년
4. 동의 거부 권리: 동의를 거부할 수 있으며, 거부 시 상담 서비스 이용이 제한될 수 있습니다.`)

        setMarketingContent(`1. 수집 항목: 이름, 연락처
2. 수집 목적: 신규 서비스, 이벤트 안내
3. 보유 기간: 동의 철회 시까지
4. 동의 거부 권리: 동의를 거부할 수 있으며, 거부 시에도 기본 서비스 이용은 가능합니다.`)
      }
    } catch (err) {
      console.error('Error loading privacy policy:', err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const { data: existing } = await supabase
        .from('privacy_policies')
        .select('id')
        .eq('company_id', companyId)
        .single()

      if (existing) {
        // Update
        const { error: updateError } = await supabase
          .from('privacy_policies')
          .update({
            privacy_consent_title: privacyTitle,
            privacy_consent_content: privacyContent,
            marketing_consent_title: marketingTitle,
            marketing_consent_content: marketingContent,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId)

        if (updateError) throw updateError
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('privacy_policies')
          .insert({
            company_id: companyId,
            privacy_consent_title: privacyTitle,
            privacy_consent_content: privacyContent,
            marketing_consent_title: marketingTitle,
            marketing_consent_content: marketingContent,
          })

        if (insertError) throw insertError
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            설정으로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold">개인정보 처리 방침</h1>
          <p className="mt-2 text-indigo-100">
            랜딩 페이지에서 사용할 개인정보 수집 및 마케팅 동의 내용을 관리합니다
          </p>
        </div>

        {/* Privacy Consent */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            개인정보 수집·이용 동의
            <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full">필수</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목
              </label>
              <input
                type="text"
                value={privacyTitle}
                onChange={(e) => setPrivacyTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                placeholder="개인정보 수집·이용 동의"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용
              </label>
              <textarea
                value={privacyContent}
                onChange={(e) => setPrivacyContent(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none font-mono text-sm"
                rows={10}
                placeholder="개인정보 수집·이용 동의 내용을 입력하세요"
              />
            </div>
          </div>
        </div>

        {/* Marketing Consent */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            마케팅 활용 동의
            <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">선택</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목
              </label>
              <input
                type="text"
                value={marketingTitle}
                onChange={(e) => setMarketingTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                placeholder="마케팅 활용 동의 (선택)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용
              </label>
              <textarea
                value={marketingContent}
                onChange={(e) => setMarketingContent(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none font-mono text-sm"
                rows={10}
                placeholder="마케팅 활용 동의 내용을 입력하세요"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckIcon className="h-5 w-5" />
              <span className="font-medium">저장되었습니다</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
