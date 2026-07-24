'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/Toast'
import {
  ArrowPathIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
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
  const toast = useToast()
  const [configs, setConfigs] = useState<SyncConfig[]>([])
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingConfig, setEditingConfig] = useState<string | null>(null) // 수정 중인 config ID

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
    landing_page_id: '', // Not used, but kept for DB compatibility
    sync_interval_minutes: 1440, // 24시간 고정 (오전 8시 실행)
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
      toast.error('스프레드시트 ID를 입력하세요')
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
      toast.error('설정 추가 실패: ' + error.message)
      return
    }

    setShowAddForm(false)
    setNewConfig({
      spreadsheet_id: '',
      sheet_name: 'Sheet1',
      landing_page_id: '', // Not used, but kept for DB compatibility
      sync_interval_minutes: 1440, // 24시간 고정 (오전 8시 실행)
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
        toast.success(`동기화 완료!\n- 가져온 데이터: ${result.imported}건\n- 중복 제외: ${result.duplicates}건`)
        loadData()
      } else {
        // Show available sheets if sheet not found
        if (result.availableSheets && result.availableSheets.length > 0) {
          const sheetList = result.availableSheets.join(', ')
          toast.error(
            `동기화 실패: ${result.error}\n\n사용 가능한 시트:\n${sheetList}\n\n힌트: ${result.hint || '위의 시트 이름 중 하나를 선택하세요'}`
          )
        } else {
          toast.error('동기화 실패: ' + (result.error || '알 수 없는 오류'))
        }
      }
    } catch (error: any) {
      toast.error('동기화 오류: ' + error.message)
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

  // 수정 모드 시작
  function startEdit(config: SyncConfig) {
    setEditingConfig(config.id)
    setNewConfig({
      spreadsheet_id: config.spreadsheet_id,
      sheet_name: config.sheet_name,
      landing_page_id: config.landing_page_id || '',
      sync_interval_minutes: config.sync_interval_minutes,
      column_mapping: {
        name: config.column_mapping.name,
        phone: config.column_mapping.phone,
        email: config.column_mapping.email || '',
        source: config.column_mapping.source || '',
        createdAt: config.column_mapping.createdAt || '',
        customFields: config.column_mapping.customFields || [],
      },
    })
  }

  // 수정 취소
  function cancelEdit() {
    setEditingConfig(null)
    setNewConfig({
      spreadsheet_id: '',
      sheet_name: 'Sheet1',
      landing_page_id: '',
      sync_interval_minutes: 1440,
      column_mapping: {
        name: '이름',
        phone: '전화번호',
        email: '이메일',
        source: '광고명',
        createdAt: '생성일',
        customFields: [],
      },
    })
  }

  // 수정 저장
  async function handleUpdateConfig() {
    if (!editingConfig) return
    if (!newConfig.spreadsheet_id) {
      toast.error('스프레드시트 ID를 입력하세요')
      return
    }

    const { error } = await supabase
      .from('sheet_sync_configs')
      .update({
        spreadsheet_id: newConfig.spreadsheet_id,
        sheet_name: newConfig.sheet_name,
        landing_page_id: newConfig.landing_page_id || null,
        sync_interval_minutes: newConfig.sync_interval_minutes,
        column_mapping: newConfig.column_mapping,
      })
      .eq('id', editingConfig)

    if (error) {
      toast.error('설정 수정 실패: ' + error.message)
      return
    }

    cancelEdit()
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
          <div className="space-y-4">
            <div>
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
                시트 이름 *
              </label>
              <input
                type="text"
                value={newConfig.sheet_name}
                onChange={(e) => setNewConfig({ ...newConfig, sheet_name: e.target.value })}
                placeholder="Sheet1"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                스프레드시트 하단 탭에 표시되는 시트 이름을 입력하세요
              </p>
            </div>
            {/* 동기화 주기 정보 (고정값) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">자동 동기화</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    매일 오전 8시(KST)에 자동으로 동기화됩니다
                  </p>
                </div>
              </div>
            </div>
            {/* [향후 업데이트] 동기화 주기 선택 기능
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
            */}
          </div>

          <div className="mt-6">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h5 className="text-base font-semibold text-gray-900 mb-1">📊 구글시트 컬럼 매핑</h5>
                  <p className="text-sm text-gray-700">
                    시트의 <strong>첫 번째 행(헤더)</strong>에 있는 열 이름과 정확히 일치하도록 입력해주세요
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border-2 border-gray-200 p-5 space-y-5">
              {/* 기본 필드 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full">1</span>
                  <p className="text-sm font-semibold text-gray-900">필수 필드</p>
                  <span className="text-xs text-red-600">*</span>
                </div>
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
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-600 text-white text-xs font-bold rounded-full">2</span>
                  <p className="text-sm font-semibold text-gray-900">선택 필드</p>
                  <span className="text-xs text-gray-500">(있으면 매핑)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">광고명/소스 열</label>
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
                    <label className="block text-xs text-gray-500 mb-1">생성일 열</label>
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
              </div>

              {/* 커스텀 필드 */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full">3</span>
                    <p className="text-sm font-semibold text-gray-900">추가 커스텀 필드</p>
                    <span className="text-xs text-gray-500">(선택사항)</span>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
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
                  <p className="text-xs text-gray-400 text-center py-3">
                    시트에 다른 열이 있다면 &quot;필드 추가&quot;를 클릭하세요
                  </p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-amber-900 mb-1">매핑 가이드</p>
                    <ul className="text-xs text-amber-800 space-y-0.5">
                      <li>• 시트의 <strong>첫 번째 행(헤더)</strong>에 있는 열 이름과 정확히 일치해야 합니다</li>
                      <li>• 대소문자와 띄어쓰기까지 정확하게 입력해주세요</li>
                      <li>• 예: 시트에 &quot;이름&quot;이라고 적혀있다면 정확히 &quot;이름&quot;으로 입력</li>
                    </ul>
                  </div>
                </div>
              </div>
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

      {/* 수정 폼 */}
      {editingConfig && (
        <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-300">
          <div className="flex items-center gap-2 mb-4">
            <PencilIcon className="h-5 w-5 text-amber-600" />
            <h4 className="font-medium text-amber-900">시트 설정 수정</h4>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheets URL 또는 스프레드시트 ID *
              </label>
              <input
                type="text"
                value={newConfig.spreadsheet_id}
                onChange={(e) => {
                  let value = e.target.value.trim()
                  if (value.includes('/d/')) {
                    const match = value.match(/\/d\/([a-zA-Z0-9-_]+)/)
                    if (match) value = match[1]
                  }
                  setNewConfig({ ...newConfig, spreadsheet_id: value })
                }}
                placeholder="https://docs.google.com/spreadsheets/d/... 또는 ID만 입력"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시트 이름 *
              </label>
              <input
                type="text"
                value={newConfig.sheet_name}
                onChange={(e) => setNewConfig({ ...newConfig, sheet_name: e.target.value })}
                placeholder="Sheet1"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                스프레드시트 하단 탭에 표시되는 시트 이름을 입력하세요
              </p>
            </div>

            {/* 동기화 주기 정보 (고정값) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">자동 동기화</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    매일 오전 8시(KST)에 자동으로 동기화됩니다
                  </p>
                </div>
              </div>
            </div>

            {/* 컬럼 매핑 섹션 - 기존과 동일한 UI */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-5 space-y-5">
              {/* 필수 필드 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full">1</span>
                  <p className="text-sm font-semibold text-gray-900">필수 필드</p>
                  <span className="text-xs text-red-600">*</span>
                </div>
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
                      placeholder="예: 이름, name"
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
                      placeholder="예: 전화번호, phone"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">이메일 열</label>
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

              {/* 선택 필드 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-600 text-white text-xs font-bold rounded-full">2</span>
                  <p className="text-sm font-semibold text-gray-900">선택 필드</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">광고명/소스 열</label>
                    <input
                      type="text"
                      value={newConfig.column_mapping.source || ''}
                      onChange={(e) => setNewConfig({
                        ...newConfig,
                        column_mapping: { ...newConfig.column_mapping, source: e.target.value }
                      })}
                      placeholder="예: 광고명, source"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">생성일 열</label>
                    <input
                      type="text"
                      value={newConfig.column_mapping.createdAt || ''}
                      onChange={(e) => setNewConfig({
                        ...newConfig,
                        column_mapping: { ...newConfig.column_mapping, createdAt: e.target.value }
                      })}
                      placeholder="예: 생성일, created_at"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 커스텀 필드 */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full">3</span>
                    <p className="text-sm font-semibold text-gray-900">추가 커스텀 필드</p>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
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
                            placeholder="저장할 필드명"
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
                  <p className="text-xs text-gray-400 text-center py-3">
                    시트에 다른 열이 있다면 &quot;필드 추가&quot;를 클릭하세요
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleUpdateConfig}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              수정 완료
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
                    onClick={() => startEdit(config)}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="수정"
                  >
                    <PencilIcon className="h-4 w-4" />
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
