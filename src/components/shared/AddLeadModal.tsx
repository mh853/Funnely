'use client'

import { useState, useRef, Fragment } from 'react'
import Link from 'next/link'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, UserPlusIcon, ArrowDownTrayIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface BulkUploadResult {
  imported: number
  total: number
  duplicates: number
  blacklisted: number
  invalid: number
}

export default function AddLeadModal({ isOpen, onClose, onSuccess }: AddLeadModalProps) {
  const [mode, setMode] = useState<'manual' | 'excel'>('manual')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [excelLoading, setExcelLoading] = useState(false)
  const [excelError, setExcelError] = useState<string | null>(null)
  const [excelResult, setExcelResult] = useState<BulkUploadResult | null>(null)

  // 전화번호 자동 포맷팅
  const handlePhoneChange = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '')

    // 010-1234-5678 형식으로 포맷팅
    let formatted = numbers
    if (numbers.length > 3) {
      formatted = numbers.slice(0, 3) + '-' + numbers.slice(3)
    }
    if (numbers.length > 7) {
      formatted = numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11)
    }

    setPhone(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 유효성 검사
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }

    if (!phone.trim()) {
      setError('전화번호를 입력해주세요.')
      return
    }

    // 전화번호 형식 검증
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
    if (!phoneRegex.test(phone.replace(/[^0-9]/g, ''))) {
      setError('올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || '리드 추가에 실패했습니다.')
      }

      // 성공
      setName('')
      setPhone('')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || '리드 추가 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMode('manual')
    setName('')
    setPhone('')
    setError(null)
    setExcelError(null)
    setExcelResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  // 엑셀 업로드 템플릿(이름/전화번호/이메일 + 회사가 구글시트 동기화에 설정해둔
  // 커스텀필드 헤더 + 예시 행) 다운로드. 커스텀필드 조회에 실패해도 템플릿
  // 다운로드 자체는 기본 3컬럼으로 계속 진행한다(선택적 기능이 필수 기능을
  // 막을 이유는 없음).
  const handleTemplateDownload = async () => {
    let customFields: Array<{ label: string; column: string }> = []
    try {
      const res = await fetch('/api/leads/bulk-upload')
      if (res.ok) {
        const data = await res.json()
        customFields = data.customFields || []
      }
    } catch {
      // 무시하고 기본 템플릿으로 진행
    }

    const XLSX = await import('xlsx')
    const headers = ['이름', '전화번호', '이메일', ...customFields.map((cf) => cf.column)]
    const exampleRow = ['홍길동', '010-1234-5678', 'hong@example.com', ...customFields.map(() => '')]
    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DB 업로드')
    XLSX.writeFile(workbook, 'DB_업로드_템플릿.xlsx')
  }

  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelError(null)
    setExcelResult(null)
    setExcelLoading(true)

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      // raw: false로 셀을 표시된 문자열 그대로 읽어야, 전화번호 컬럼을 숫자
      // 서식으로 인식한 셀의 값(예: 1012345678)이 앞자리 0이 잘린 상태로 와도
      // 서버 쪽 parseSheetToLeads가 처리할 수 있는 문자열 형태로 넘어간다.
      const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: '',
      })

      const response = await fetch('/api/leads/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || '엑셀 업로드에 실패했습니다.')
      }

      setExcelResult(data)
      if (data.imported > 0) onSuccess()
    } catch (err: any) {
      setExcelError(err.message || '엑셀 파일을 읽는 중 오류가 발생했습니다.')
    } finally {
      setExcelLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlusIcon className="h-5 w-5" />
                      <Dialog.Title as="h3" className="text-lg font-bold">
                        DB 수동 추가
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={handleClose}
                      className="p-2 hover:bg-white/20 rounded-full transition"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* 입력 방식 탭 */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-2.5 text-sm font-medium transition border-b-2 ${
                      mode === 'manual'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    직접 입력
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('excel')}
                    className={`flex-1 py-2.5 text-sm font-medium transition border-b-2 ${
                      mode === 'excel'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    엑셀 업로드
                  </button>
                </div>

                {/* Content */}
                {mode === 'manual' ? (
                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        {error}
                      </div>
                    )}

                    {/* 이름 */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        이름 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="홍길동"
                        required
                        autoFocus
                      />
                    </div>

                    {/* 전화번호 */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        전화번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="010-1234-5678"
                        maxLength={13}
                        required
                      />
                    </div>

                    {/* 안내 메시지 */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                      <p className="text-xs text-blue-800">
                        💡 추가된 DB는 &ldquo;상담 전&rdquo; 상태로 저장됩니다.
                      </p>
                      <p className="text-xs text-blue-800">
                        DB를 대량으로 등록하려면{' '}
                        <Link
                          href="/dashboard/settings/sheet-sync"
                          className="font-medium underline hover:text-blue-900"
                        >
                          대량 구글스프레드시트 연동
                        </Link>
                        을 이용하시거나, 위 &ldquo;엑셀 업로드&rdquo; 탭을 이용해주세요.
                      </p>
                    </div>
                  </form>
                ) : (
                  <div className="p-6 space-y-5">
                    {excelError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        {excelError}
                      </div>
                    )}

                    {excelResult && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
                        <p className="text-sm font-medium text-green-800">
                          {excelResult.imported}건 등록 완료
                        </p>
                        {(excelResult.duplicates > 0 ||
                          excelResult.blacklisted > 0 ||
                          excelResult.invalid > 0) && (
                          <p className="text-xs text-green-700">
                            전체 {excelResult.total}건 중{' '}
                            {excelResult.duplicates > 0 && `중복 ${excelResult.duplicates}건`}
                            {excelResult.blacklisted > 0 &&
                              `${excelResult.duplicates > 0 ? ', ' : ''}블랙리스트 ${excelResult.blacklisted}건`}
                            {excelResult.invalid > 0 &&
                              `${excelResult.duplicates > 0 || excelResult.blacklisted > 0 ? ', ' : ''}형식 오류 ${excelResult.invalid}건`}{' '}
                            제외
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <button
                        type="button"
                        onClick={handleTemplateDownload}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        템플릿 다운로드
                      </button>
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelFileSelect}
                        disabled={excelLoading}
                        className="hidden"
                        id="excel-upload-input"
                      />
                      <label
                        htmlFor="excel-upload-input"
                        className={`flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg text-center transition ${
                          excelLoading
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                            : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer'
                        }`}
                      >
                        {excelLoading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                        ) : (
                          <>
                            <DocumentArrowUpIcon className="h-6 w-6 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              클릭해서 작성한 템플릿 파일(.xlsx)을 업로드하세요
                            </span>
                          </>
                        )}
                      </label>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        💡 템플릿의 컬럼명을 바꾸지 말고 작성해주세요. 이메일과{' '}
                        <Link
                          href="/dashboard/settings/sheet-sync"
                          className="font-medium underline hover:text-blue-900"
                        >
                          구글스프레드시트 연동
                        </Link>
                        에 등록해둔 추가 항목(있는 경우)은 비워두셔도 됩니다. 등록된 DB는
                        &ldquo;상담 전&rdquo; 상태로 저장됩니다.
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                  {mode === 'manual' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        {loading ? '추가 중...' : 'DB 추가'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                    >
                      닫기
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
