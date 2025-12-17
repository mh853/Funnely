'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Mail,
  Save,
  Send,
  Eye,
  Code,
  ArrowLeft,
  Settings,
  Loader2,
} from 'lucide-react'
import type {
  EmailTemplate,
  EmailTemplateUpdateInput,
  EmailCategory,
} from '@/types/email'
import { AVAILABLE_VARIABLES, EMAIL_CATEGORIES } from '@/types/email'
import { previewTemplate } from '@/lib/email/template-renderer'

export default function EmailTemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string
  const isNew = templateId === 'new'

  const [template, setTemplate] = useState<Partial<EmailTemplate>>({
    name: '',
    subject: '',
    html_body: '',
    text_body: '',
    settings: {
      fromName: 'MediSync',
      fromEmail: 'noreply@medisync.com',
      trackOpens: true,
      trackClicks: true,
    },
    is_active: true,
  })

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [previewMode, setPreviewMode] = useState<'rendered' | 'code'>('rendered')
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content')

  useEffect(() => {
    if (!isNew) {
      fetchTemplate()
    }
  }, [templateId])

  async function fetchTemplate() {
    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`)
      if (!response.ok) throw new Error('Failed to fetch template')

      const data = await response.json()
      setTemplate(data.template)
    } catch (error) {
      console.error('Error fetching template:', error)
      alert('템플릿을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)

      const url = isNew
        ? '/api/admin/email-templates'
        : `/api/admin/email-templates/${templateId}`

      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save template')
      }

      const data = await response.json()

      if (isNew) {
        router.push(`/admin/email-templates/${data.template.id}`)
      } else {
        setTemplate(data.template)
      }

      alert('템플릿이 저장되었습니다.')
    } catch (error) {
      console.error('Error saving template:', error)
      alert(error instanceof Error ? error.message : '템플릿 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendTest() {
    if (!testEmail) {
      alert('테스트 이메일 주소를 입력해주세요.')
      return
    }

    try {
      setSendingTest(true)

      const response = await fetch(`/api/admin/email-templates/${templateId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          variables: {},
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send test email')
      }

      alert('테스트 이메일이 발송되었습니다.')
      setTestEmail('')
    } catch (error) {
      console.error('Error sending test email:', error)
      alert(error instanceof Error ? error.message : '테스트 이메일 발송에 실패했습니다.')
    } finally {
      setSendingTest(false)
    }
  }

  function insertVariable(variableKey: string) {
    const cursorPos = (document.getElementById('html-editor') as HTMLTextAreaElement)?.selectionStart || 0
    const currentHtml = template.html_body || ''
    const newHtml =
      currentHtml.slice(0, cursorPos) +
      `{{${variableKey}}}` +
      currentHtml.slice(cursorPos)

    setTemplate({ ...template, html_body: newHtml })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const renderedPreview = template.html_body
    ? previewTemplate(template.html_body)
    : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Mail className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-semibold">
                {isNew ? '새 이메일 템플릿' : template.name}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {!isNew && (
                <div className="flex items-center gap-2 mr-4">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="테스트 이메일"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {sendingTest ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    테스트 발송
                  </button>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                저장
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('content')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'content'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              컨텐츠
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              설정
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'content' ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Editor */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  템플릿 이름
                </label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) =>
                    setTemplate({ ...template, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="예: 신규 가입 환영 이메일"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리
                </label>
                <select
                  value={template.category || ''}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      category: e.target.value as EmailCategory,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">선택 안함</option>
                  {EMAIL_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={template.subject}
                  onChange={(e) =>
                    setTemplate({ ...template, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="이메일 제목 (변수 사용 가능: {{user_name}})"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTML 본문
                </label>
                <textarea
                  id="html-editor"
                  value={template.html_body}
                  onChange={(e) =>
                    setTemplate({ ...template, html_body: e.target.value })
                  }
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="HTML 컨텐츠를 입력하세요..."
                />
              </div>

              {/* Variable Palette */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  변수 삽입
                </h3>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.slice(0, 10).map((variable) => (
                    <button
                      key={variable.key}
                      onClick={() => insertVariable(variable.key)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-mono"
                      title={variable.description}
                    >
                      {`{{${variable.key}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">미리보기</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewMode('rendered')}
                    className={`p-2 rounded ${
                      previewMode === 'rendered'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('code')}
                    className={`p-2 rounded ${
                      previewMode === 'code'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Code className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg p-4 bg-white min-h-[600px]">
                {previewMode === 'rendered' ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: renderedPreview }}
                    className="prose max-w-none"
                  />
                ) : (
                  <pre className="text-xs font-mono overflow-auto">
                    {renderedPreview}
                  </pre>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                발신자 정보
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    발신자 이름
                  </label>
                  <input
                    type="text"
                    value={template.settings?.fromName || ''}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        settings: {
                          ...template.settings!,
                          fromName: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    발신자 이메일
                  </label>
                  <input
                    type="email"
                    value={template.settings?.fromEmail || ''}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        settings: {
                          ...template.settings!,
                          fromEmail: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    회신 주소 (선택)
                  </label>
                  <input
                    type="email"
                    value={template.settings?.replyTo || ''}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        settings: {
                          ...template.settings!,
                          replyTo: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium mb-4">추적 설정</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={template.settings?.trackOpens || false}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        settings: {
                          ...template.settings!,
                          trackOpens: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">이메일 오픈 추적</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={template.settings?.trackClicks || false}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        settings: {
                          ...template.settings!,
                          trackClicks: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">링크 클릭 추적</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium mb-4">활성화 상태</h3>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={template.is_active || false}
                  onChange={(e) =>
                    setTemplate({ ...template, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm text-gray-700">
                  템플릿 활성화 (자동 발송 가능)
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
