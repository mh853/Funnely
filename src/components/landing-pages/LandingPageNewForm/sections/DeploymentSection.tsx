'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { useLandingPageForm } from '../context'
import { generateLandingPageURL } from '@/lib/utils/landing-page-url'
import type { CompanyCustomDomain } from '@/types/custom-domain.types'
import Link from 'next/link'

type DomainMode = 'service' | 'company_default' | 'custom'

interface Props {
  companyShortId?: string
  companyId?: string
  landingPageId?: string
}

export default function DeploymentSection({ companyShortId, companyId, landingPageId }: Props) {
  const { state } = useLandingPageForm()

  const [domains, setDomains] = useState<CompanyCustomDomain[]>([])
  const [domainsLoading, setDomainsLoading] = useState(false)
  const [domainMode, setDomainMode] = useState<DomainMode>('service')
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)
  const [savingDomain, setSavingDomain] = useState(false)
  const [domainSaveMsg, setDomainSaveMsg] = useState<string | null>(null)

  const verifiedDomains = domains.filter(d => d.verification_status === 'verified')
  const defaultDomain = verifiedDomains.find(d => d.is_company_default)

  useEffect(() => {
    if (!companyId) return
    setDomainsLoading(true)
    fetch('/api/company/custom-domains')
      .then(r => r.json())
      .then(data => setDomains(data.domains || []))
      .catch(() => {})
      .finally(() => setDomainsLoading(false))
  }, [companyId])

  useEffect(() => {
    if (!landingPageId) return
    fetch(`/api/landing-pages/${landingPageId}/custom-domain`)
      .then(r => r.json())
      .then(data => {
        if (data.customDomainId) {
          setDomainMode('custom')
          setSelectedDomainId(data.customDomainId)
        } else if (defaultDomain) {
          setDomainMode('company_default')
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingPageId])

  const getActiveUrl = () => {
    if (!state.slug || !companyShortId) return ''
    if (domainMode === 'custom' && selectedDomainId) {
      const selected = verifiedDomains.find(d => d.id === selectedDomainId)
      if (selected) return generateLandingPageURL(companyShortId, state.slug, { landingPageDomain: selected.domain })
    }
    if (domainMode === 'company_default' && defaultDomain) {
      return generateLandingPageURL(companyShortId, state.slug, { companyDefaultDomain: defaultDomain.domain })
    }
    return generateLandingPageURL(companyShortId, state.slug)
  }

  const previewUrl = getActiveUrl()

  const copyToClipboard = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl)
      alert('URL이 클립보드에 복사되었습니다!')
    }
  }

  const handleDomainSave = async () => {
    if (!landingPageId) return
    setSavingDomain(true)
    setDomainSaveMsg(null)
    try {
      const res = await fetch(`/api/landing-pages/${landingPageId}/custom-domain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomainId: domainMode === 'custom' ? selectedDomainId : null }),
      })
      if (res.ok) {
        setDomainSaveMsg('도메인 설정이 저장되었습니다.')
        setTimeout(() => setDomainSaveMsg(null), 3000)
      } else {
        const data = await res.json()
        setDomainSaveMsg(`오류: ${data.error}`)
      }
    } catch {
      setDomainSaveMsg('저장에 실패했습니다.')
    } finally {
      setSavingDomain(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">배포 설정</h2>
        <p className="mt-1 text-sm text-gray-600">랜딩페이지 활성화 및 URL을 관리하세요</p>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          {state.isActive ? (
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
          ) : (
            <XCircleIcon className="h-6 w-6 text-gray-400" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {state.isActive ? '활성화됨' : '비활성화됨'}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {state.isActive ? '랜딩페이지가 공개되어 있습니다' : '랜딩페이지가 비공개 상태입니다'}
            </p>
          </div>
        </div>
      </div>

      {state.slug && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900">현재 랜딩페이지 주소</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={previewUrl}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={copyToClipboard}
              disabled={!previewUrl}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              복사
            </button>
          </div>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              새 탭에서 미리보기
            </a>
          )}
        </div>
      )}

      {companyId && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-900">도메인 설정</label>
            <Link href="/dashboard/settings" className="text-xs text-indigo-600 hover:text-indigo-700">
              도메인 관리 →
            </Link>
          </div>

          {domainsLoading ? (
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
          ) : verifiedDomains.length === 0 ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <GlobeAltIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-600">
                서비스 도메인을 사용 중입니다.{' '}
                <Link href="/dashboard/settings" className="text-indigo-600 hover:underline">커스텀 도메인 추가</Link>
                하면 브랜드 도메인으로 운영할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="domainMode"
                  value="service"
                  checked={domainMode === 'service'}
                  onChange={() => setDomainMode('service')}
                  className="mt-0.5 text-indigo-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">서비스 도메인 사용</p>
                  {companyShortId && state.slug && (
                    <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                      {companyShortId}.funnely.co.kr/landing/{state.slug}
                    </p>
                  )}
                </div>
              </label>

              {defaultDomain && (
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="domainMode"
                    value="company_default"
                    checked={domainMode === 'company_default'}
                    onChange={() => setDomainMode('company_default')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-700">회사 기본 도메인</p>
                      <span className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-600 rounded">기본</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                      {defaultDomain.domain}/landing/{state.slug}
                    </p>
                  </div>
                </label>
              )}

              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="domainMode"
                  value="custom"
                  checked={domainMode === 'custom'}
                  onChange={() => setDomainMode('custom')}
                  className="mt-0.5 text-indigo-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">다른 도메인 사용</p>
                  <p className="text-xs text-gray-400 mt-0.5">이 랜딩페이지만 별도 도메인 적용</p>
                  {domainMode === 'custom' && (
                    <select
                      value={selectedDomainId || ''}
                      onChange={e => setSelectedDomainId(e.target.value || null)}
                      className="mt-2 w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500"
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="">도메인 선택...</option>
                      {verifiedDomains.map(d => (
                        <option key={d.id} value={d.id}>{d.domain}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>

              {landingPageId && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDomainSave}
                    disabled={savingDomain || (domainMode === 'custom' && !selectedDomainId)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingDomain ? '저장 중...' : '도메인 설정 저장'}
                  </button>
                  {domainSaveMsg && (
                    <p className={`text-xs ${domainSaveMsg.startsWith('오류') ? 'text-red-600' : 'text-green-600'}`}>
                      {domainSaveMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!state.slug && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="h-5 w-5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-yellow-900">URL이 설정되지 않았습니다</h4>
              <p className="text-xs text-yellow-800 mt-1">기본 정보에서 URL 슬러그를 입력해주세요.</p>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">배포 전 체크리스트</h3>
        <div className="space-y-2">
          {[
            { checked: !!state.title, label: '페이지 제목 설정 완료' },
            { checked: !!state.slug, label: 'URL 슬러그 설정 완료' },
            { checked: state.images.length > 0, label: '히어로 이미지 업로드 완료' },
            { checked: state.collectData, label: '데이터 수집 설정 완료' },
            { checked: !!state.privacyContent, label: '개인정보 동의 설정 완료' },
          ].map(({ checked, label }) => (
            <label key={label} className="flex items-start gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={checked} disabled className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded" />
              <span className={checked ? 'text-green-700' : 'text-gray-500'}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {state.title && state.slug && state.images.length > 0 && state.collectData && state.privacyContent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-green-900">배포 준비 완료!</h4>
              <p className="text-xs text-green-800 mt-1">모든 필수 설정이 완료되었습니다. 저장 후 바로 사용할 수 있습니다.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
