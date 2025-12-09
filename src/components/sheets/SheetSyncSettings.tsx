'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowPathIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface SyncConfig {
  id: string
  spreadsheet_id: string
  sheet_name: string
  landing_page_id: string | null
  column_mapping: {
    name: string
    phone: string
    email?: string
    source?: string
    createdAt?: string
    customFields?: Array<{ label: string; column: string }>
  }
  is_active: boolean
  sync_interval_minutes: number
  last_synced_at: string | null
}

interface SyncLog {
  id: string
  spreadsheet_id: string
  imported_count: number
  total_rows: number
  duplicates_skipped: number
  error_message: string | null
  created_at: string
}

interface LandingPage {
  id: string
  title: string
}

export default function SheetSyncSettings({
  companyId,
  landingPages,
}: {
  companyId: string
  landingPages: LandingPage[]
}) {
  const supabase = createClient()
  const [configs, setConfigs] = useState<SyncConfig[]>([])
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // 새 설정 폼 상태
  const [newConfig, setNewConfig] = useState<{
    spreadsheet_id: string
    sheet_name: string
    landing_page_id: string
    sync_interval_minutes: number
    column_mapping: {
      name: string
      phone: string
      email: string
      source: string
      createdAt: string
      customFields: Array<{ label: string; column: string }>
    }
  }>({
    spreadsheet_id: '',
    sheet_name: 'Sheet1',
    landing_page_id: '',
    sync_interval_minutes: 60,
    column_mapping: {
      name: '이름',
      phone: '전화번호',
      email: '이메일',
      source: '광고명',
      createdAt: '생성일',
      customFields: [],
    },
  })

  // 커스텀 필드 추가
  const addCustomField = () => {
    setNewConfig({
      ...newConfig,
      column_mapping: {
        ...newConfig.column_mapping,
        customFields: [
          ...newConfig.column_mapping.customFields,
          { label: '', column: '' }
        ]
      }
    })
  }

  // 커스텀 필드 수정
  const updateCustomField = (index: number, field: 'label' | 'column', value: string) => {
    const updatedFields = [...newConfig.column_mapping.customFields]
    updatedFields[index] = { ...updatedFields[index], [field]: value }
    setNewConfig({
      ...newConfig,
      column_mapping: {
        ...newConfig.column_mapping,
        customFields: updatedFields
      }
    })
  }

  // 커스텀 필드 삭제
  const removeCustomField = (index: number) => {
    setNewConfig({
      ...newConfig,
      column_mapping: {
        ...newConfig.column_mapping,
        customFields: newConfig.column_mapping.customFields.filter((_, i) => i !== index)
      }
    })
  }

  useEffect(() => {
    loadData()
  }, [companyId])

  async function loadData() {
    setLoading(true)

    const [configsResult, logsResult] = await Promise.all([
      supabase
        .from('sheet_sync_configs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('sheet_sync_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    setConfigs(configsResult.data || [])
    setLogs(logsResult.data || [])
    setLoading(false)
  }

  async function handleAddConfig() {
    if (!newConfig.spreadsheet_id) {
      alert('스프레드시트 ID를 입력하세요')
      return
    }

    const { error } = await supabase.from('sheet_sync_configs').insert({
      company_id: companyId,
      spreadsheet_id: newConfig.spreadsheet_id,
      sheet_name: newConfig.sheet_name,
      landing_page_id: newConfig.landing_page_id || null,
      sync_interval_minutes: newConfig.sync_interval_minutes,
      column_mapping: newConfig.column_mapping,
      is_active: true,
    })

    if (error) {
      alert('설정 추가 실패: ' + error.message)
      return
    }

    setShowAddForm(false)
    setNewConfig({
      spreadsheet_id: '',
      sheet_name: 'Sheet1',
      landing_page_id: '',
      sync_interval_minutes: 60,
      column_mapping: {
        name: '이름',
        phone: '전화번호',
        email: '이메일',
        source: '광고명',
        createdAt: '생성일',
        customFields: [],
      },
    })
    loadData()
  }

  async function handleSync(config: SyncConfig) {
    setSyncing(config.id)

    try {
      const response = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: config.spreadsheet_id,
          sheetName: config.sheet_name,
          companyId,
          landingPageId: config.landing_page_id,
          columnMapping: config.column_mapping,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(`동기화 완료!\n- 가져온 데이터: ${result.imported}건\n- 중복 제외: ${result.duplicates}건`)
        loadData()
      } else {
        alert('동기화 실패: ' + result.error)
      }
    } catch (error: any) {
      alert('동기화 오류: ' + error.message)
    } finally {
      setSyncing(null)
    }
  }

  async function handleToggleActive(config: SyncConfig) {
    await supabase
      .from('sheet_sync_configs')
      .update({ is_active: !config.is_active })
      .eq('id', config.id)
    loadData()
  }

  async function handleDelete(configId: string) {
    if (!confirm('이 동기화 설정을 삭제하시겠습니까?')) return

    await supabase.from('sheet_sync_configs').delete().eq('id', configId)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Google Sheets 동기화</h3>
          <p className="text-sm text-gray-500">Meta 광고 데이터를 자동으로 가져옵니다</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          시트 연결
        </button>
      </div>

      {/* 새 설정 추가 폼 */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-xl p-6 border">
          <h4 className="font-medium mb-4">새 시트 연결</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheets URL 또는 스프레드시트 ID *
              </label>
              <input
                type="text"
                value={newConfig.spreadsheet_id}
                onChange={(e) => {
                  let value = e.target.value.trim()
                  // URL에서 스프레드시트 ID 자동 추출
                  const urlMatch = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
                  if (urlMatch) {
                    value = urlMatch[1]
                  }
                  setNewConfig({ ...newConfig, spreadsheet_id: value })
                }}
                placeholder="https://docs.google.com/spreadsheets/d/... 또는 ID만 입력"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 전체 URL을 붙여넣으면 자동으로 ID가 추출됩니다
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시트 이름
              </label>
              <input
                type="text"
                value={newConfig.sheet_name}
                onChange={(e) => setNewConfig({ ...newConfig, sheet_name: e.target.value })}
                placeholder="Sheet1"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연결할 랜딩페이지
              </label>
              <select
                value={newConfig.landing_page_id}
                onChange={(e) => setNewConfig({ ...newConfig, landing_page_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">선택 안함</option>
                {landingPages.map((lp) => (
                  <option key={lp.id} value={lp.id}>{lp.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                동기화 주기
              </label>
              <select
                value={newConfig.sync_interval_minutes}
                onChange={(e) => setNewConfig({ ...newConfig, sync_interval_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value={30}>30분</option>
                <option value={60}>1시간</option>
                <option value={180}>3시간</option>
                <option value={360}>6시간</option>
                <option value={720}>12시간</option>
                <option value={1440}>24시간</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-gray-700">컬럼 매핑</h5>
              <span className="text-xs text-gray-500">시트의 열 이름을 입력하세요</span>
            </div>
            <div className="bg-white rounded-lg border p-4 space-y-4">
              {/* 기본 필드 */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">기본 필드</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">이름 열 *</label>
                    <input
                      type="text"
                      value={newConfig.column_mapping.name}
                      onChange={(e) => setNewConfig({
                        ...newConfig,
                        column_mapping: { ...newConfig.column_mapping, name: e.target.value }
                      })}
                      placeholder="예: 이름, 성명, name"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">전화번호 열 *</label>
                    <input
                      type="text"
                      value={newConfig.column_mapping.phone}
                      onChange={(e) => setNewConfig({
                        ...newConfig,
                        column_mapping: { ...newConfig.column_mapping, phone: e.target.value }
                      })}
                      placeholder="예: 전화번호, 연락처, phone"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">이메일 열 (선택)</label>
                    <input
                      type="text"
                      value={newConfig.column_mapping.email || ''}
                      onChange={(e) => setNewConfig({
                        ...newConfig,
                        column_mapping: { ...newConfig.column_mapping, email: e.target.value }
                      })}
                      placeholder="예: 이메일, email"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 추가 기본 필드 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">광고명/소스 열 (선택)</label>
                  <input
                    type="text"
                    value={newConfig.column_mapping.source || ''}
                    onChange={(e) => setNewConfig({
                      ...newConfig,
                      column_mapping: { ...newConfig.column_mapping, source: e.target.value }
                    })}
                    placeholder="예: 광고명, 캠페인, source"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">생성일 열 (선택)</label>
                  <input
                    type="text"
                    value={newConfig.column_mapping.createdAt || ''}
                    onChange={(e) => setNewConfig({
                      ...newConfig,
                      column_mapping: { ...newConfig.column_mapping, createdAt: e.target.value }
                    })}
                    placeholder="예: 생성일, 등록일, created_at"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* 커스텀 필드 */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-600">추가 필드 (선택)</p>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    필드 추가
                  </button>
                </div>

                {newConfig.column_mapping.customFields.length > 0 ? (
                  <div className="space-y-2">
                    {newConfig.column_mapping.customFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                            placeholder="필드명 (예: 관심분야)"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <span className="text-gray-400">→</span>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={field.column}
                            onChange={(e) => updateCustomField(index, 'column', e.target.value)}
                            placeholder="시트 열 이름"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCustomField(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-2">
                    시트에 다른 열이 있다면 &quot;필드 추가&quot;를 클릭하세요
                  </p>
                )}
              </div>

              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                💡 시트의 첫 번째 행(헤더)에 있는 열 이름과 정확히 일치해야 합니다
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAddConfig}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              연결하기
            </button>
          </div>
        </div>
      )}

      {/* 연결된 시트 목록 */}
      {configs.length > 0 ? (
        <div className="space-y-3">
          {configs.map((config) => (
            <div
              key={config.id}
              className={`border rounded-xl p-4 ${config.is_active ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CloudArrowDownIcon className="h-5 w-5 text-indigo-500" />
                    <span className="font-medium text-gray-900">
                      {config.sheet_name}
                    </span>
                    {!config.is_active && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        비활성
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-mono">
                    ID: {config.spreadsheet_id.slice(0, 20)}...
                  </p>
                  {config.last_synced_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      마지막 동기화: {new Date(config.last_synced_at).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(config)}
                    disabled={syncing === config.id}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`h-4 w-4 mr-1 ${syncing === config.id ? 'animate-spin' : ''}`} />
                    {syncing === config.id ? '동기화 중...' : '지금 동기화'}
                  </button>
                  <button
                    onClick={() => handleToggleActive(config)}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      config.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {config.is_active ? '활성' : '비활성'}
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <CloudArrowDownIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">연결된 시트가 없습니다</p>
          <p className="text-sm text-gray-400">위의 &quot;시트 연결&quot; 버튼을 클릭하여 시작하세요</p>
        </div>
      )}

      {/* 동기화 로그 */}
      {logs.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">최근 동기화 기록</h4>
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">시간</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">결과</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">가져옴</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">중복</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.slice(0, 10).map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(log.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-2">
                      {log.error_message ? (
                        <span className="inline-flex items-center text-red-600">
                          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                          실패
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-green-600">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          성공
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {log.imported_count}건
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      {log.duplicates_skipped}건
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
