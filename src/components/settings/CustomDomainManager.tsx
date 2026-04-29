'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlobeAltIcon, CheckCircleIcon, XCircleIcon, ClockIcon, PlusIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import type { CompanyCustomDomain } from '@/types/custom-domain.types'

type Step = 'list' | 'add-domain' | 'dns-guide' | 'verifying'

interface DnsGuideData {
  domainId: string
  domain: string
  verificationToken: string
}

export default function CustomDomainManager() {
  const [domains, setDomains] = useState<CompanyCustomDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('list')
  const [newDomain, setNewDomain] = useState('')
  const [dnsGuide, setDnsGuide] = useState<DnsGuideData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch('/api/company/custom-domains')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setDomains(data.domains || [])
    } catch {
      setError('도메인 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/company/custom-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '도메인 등록에 실패했습니다.')
        return
      }

      // Vercel에 등록
      await fetch(`/api/company/custom-domains/${data.domain.id}/vercel`, {
        method: 'POST',
      })

      setDnsGuide({
        domainId: data.domain.id,
        domain: data.domain.domain,
        verificationToken: data.domain.verification_token,
      })
      setStep('dns-guide')
      await fetchDomains()
    } catch {
      setError('도메인 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (domainId: string) => {
    setVerifying(domainId)
    setError(null)

    try {
      const res = await fetch(`/api/company/custom-domains/${domainId}/verify`, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.verified) {
        showSuccess('도메인 소유권이 확인되었습니다!')
        await fetchDomains()
      } else {
        setError(data.message || 'DNS 레코드를 찾을 수 없습니다. 설정 후 최대 48시간이 소요될 수 있습니다.')
      }
    } catch {
      setError('인증 확인 중 오류가 발생했습니다.')
    } finally {
      setVerifying(null)
    }
  }

  const handleSetDefault = async (domainId: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/company/custom-domains/${domainId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_company_default: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '기본 도메인 설정에 실패했습니다.')
        return
      }
      showSuccess('기본 도메인이 설정되었습니다.')
      await fetchDomains()
    } catch {
      setError('기본 도메인 설정 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (domainId: string, domain: string) => {
    if (!confirm(`"${domain}" 도메인을 삭제하시겠습니까?`)) return
    setError(null)
    try {
      const res = await fetch(`/api/company/custom-domains/${domainId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '삭제에 실패했습니다.')
        return
      }
      showSuccess('도메인이 삭제되었습니다.')
      await fetchDomains()
    } catch {
      setError('삭제 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (domain: CompanyCustomDomain) => {
    if (domain.verification_status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          인증됨
        </span>
      )
    }
    if (domain.verification_status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircleIcon className="h-3.5 w-3.5" />
          인증 실패
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <ClockIcon className="h-3.5 w-3.5" />
        인증 대기
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-indigo-100 rounded-lg">
              <GlobeAltIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">커스텀 도메인</h2>
              <p className="text-xs text-gray-500 mt-0.5">고객사 보유 도메인을 랜딩페이지에 연결합니다</p>
            </div>
          </div>
          {step === 'list' && (
            <button
              onClick={() => { setStep('add-domain'); setNewDomain(''); setError(null) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              도메인 추가
            </button>
          )}
        </div>
      </div>

      {/* 알림 메시지 */}
      {(error || successMessage) && (
        <div className={`px-6 py-3 ${error ? 'bg-red-50 border-b border-red-100' : 'bg-green-50 border-b border-green-100'}`}>
          <p className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>
            {error || successMessage}
          </p>
        </div>
      )}

      {/* Step: 도메인 입력 */}
      {step === 'add-domain' && (
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              도메인 주소
            </label>
            <input
              type="text"
              value={newDomain}
              onChange={e => { setNewDomain(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
              placeholder="my-clinic.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">www 없이 루트 도메인을 입력하세요.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setStep('list'); setError(null) }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAddDomain}
              disabled={submitting || !newDomain.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '등록 중...' : '다음 단계 →'}
            </button>
          </div>
        </div>
      )}

      {/* Step: DNS 설정 안내 */}
      {step === 'dns-guide' && dnsGuide && (
        <div className="px-6 py-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">DNS 설정 안내</h3>
            <p className="text-xs text-gray-600">
              <span className="font-medium text-indigo-600">{dnsGuide.domain}</span>의 DNS 관리 페이지(가비아, Cloudflare 등)에서 아래 레코드를 추가해주세요.
            </p>
          </div>

          {/* Step 1: 소유권 인증 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Step 1. 소유권 인증 레코드</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left py-1 pr-3 font-medium">유형</th>
                    <th className="text-left py-1 pr-3 font-medium">호스트</th>
                    <th className="text-left py-1 font-medium">값</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-mono">
                    <td className="py-1 pr-3 text-gray-700">TXT</td>
                    <td className="py-1 pr-3 text-gray-700">_funnely-verify</td>
                    <td className="py-1 text-gray-700 break-all">{dnsGuide.verificationToken}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 2: 도메인 연결 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Step 2. 도메인 연결 레코드</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left py-1 pr-3 font-medium">유형</th>
                    <th className="text-left py-1 pr-3 font-medium">호스트</th>
                    <th className="text-left py-1 font-medium">값</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-mono">
                    <td className="py-1 pr-3 text-gray-700">CNAME</td>
                    <td className="py-1 pr-3 text-gray-700">@ (루트)</td>
                    <td className="py-1 text-gray-700">cname.vercel-dns.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
            ℹ️ DNS 변경사항 적용에 최대 48시간이 걸릴 수 있습니다.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => { setStep('list'); setDnsGuide(null) }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              나중에 인증하기
            </button>
            <button
              onClick={async () => {
                await handleVerify(dnsGuide.domainId)
                setStep('list')
                setDnsGuide(null)
              }}
              disabled={verifying === dnsGuide.domainId}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {verifying === dnsGuide.domainId ? '확인 중...' : '인증 확인하기'}
            </button>
          </div>
        </div>
      )}

      {/* Step: 도메인 목록 */}
      {step === 'list' && (
        <div className="divide-y divide-gray-100">
          {domains.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <GlobeAltIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">등록된 커스텀 도메인이 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">
                고객사 도메인을 연결하면 <br />
                랜딩페이지 URL을 브랜드 도메인으로 사용할 수 있습니다.
              </p>
            </div>
          ) : (
            domains.map(domain => (
              <div key={domain.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">{domain.domain}</span>
                      {getStatusBadge(domain)}
                      {domain.is_company_default && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          <StarIcon className="h-3 w-3" />
                          기본 도메인
                        </span>
                      )}
                    </div>

                    {domain.verification_status !== 'verified' && (
                      <div className="mt-2 p-2.5 bg-yellow-50 rounded-lg space-y-1">
                        <p className="text-xs font-medium text-yellow-800">DNS 설정 필요</p>
                        <div className="text-xs font-mono text-yellow-700 space-y-0.5">
                          <p>TXT · _funnely-verify · {domain.verification_token}</p>
                          <p>CNAME · @ · cname.vercel-dns.com</p>
                        </div>
                      </div>
                    )}

                    {domain.verification_status === 'verified' && domain.vercel_registered && (
                      <p className="mt-1 text-xs text-gray-400">
                        랜딩페이지: https://{domain.domain}/landing/...
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* 인증 버튼 (미인증 상태) */}
                    {domain.verification_status !== 'verified' && (
                      <button
                        onClick={() => handleVerify(domain.id)}
                        disabled={verifying === domain.id}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {verifying === domain.id ? '확인 중...' : '인증 확인'}
                      </button>
                    )}

                    {/* 기본 도메인 설정 버튼 */}
                    {domain.verification_status === 'verified' && !domain.is_company_default && (
                      <button
                        onClick={() => handleSetDefault(domain.id)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title="기본 도메인으로 설정"
                      >
                        기본 설정
                      </button>
                    )}

                    {domain.verification_status === 'verified' && domain.is_company_default && (
                      <CheckCircleSolid className="h-5 w-5 text-indigo-500" />
                    )}

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleDelete(domain.id, domain.domain)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="도메인 삭제"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 현재 적용 중인 기본 도메인 요약 */}
      {step === 'list' && domains.some(d => d.is_company_default && d.verification_status === 'verified') && (
        <div className="px-6 py-3 bg-indigo-50 border-t border-indigo-100">
          {(() => {
            const defaultDomain = domains.find(d => d.is_company_default && d.verification_status === 'verified')
            return (
              <p className="text-xs text-indigo-700">
                <span className="font-medium">현재 기본 도메인:</span> {defaultDomain?.domain} —
                모든 랜딩페이지 주소가 이 도메인을 사용합니다.
              </p>
            )
          })()}
        </div>
      )}
    </div>
  )
}
