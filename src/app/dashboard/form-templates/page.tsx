import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

export default async function FormTemplatesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get form templates
  const { data: templates } = await supabase
    .from('form_templates')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">폼 템플릿</h1>
          <p className="mt-1 text-sm text-gray-600">
            랜딩 페이지에서 사용할 DB 수집 폼을 만들고 관리합니다.
          </p>
        </div>
        <Link
          href="/dashboard/form-templates/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          새 폼 템플릿
        </Link>
      </div>

      {/* Templates List */}
      {!templates || templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">폼 템플릿 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            첫 폼 템플릿을 만들어 DB 수집을 시작하세요.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/form-templates/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              폼 템플릿 만들기
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {templates.map((template: any) => (
              <li key={template.id}>
                <Link
                  href={`/dashboard/form-templates/${template.id}`}
                  className="block hover:bg-gray-50 transition"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {template.name}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            {template.is_active ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                활성
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                비활성
                              </span>
                            )}
                          </div>
                        </div>
                        {template.description && (
                          <p className="mt-2 text-sm text-gray-500">{template.description}</p>
                        )}
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span>
                            필드 {template.fields?.length || 0}개
                          </span>
                          {template.enable_timer && (
                            <>
                              <span className="mx-2">•</span>
                              <span>타이머 활성</span>
                            </>
                          )}
                          {template.enable_counter && (
                            <>
                              <span className="mx-2">•</span>
                              <span>카운터 활성 ({template.counter_current}/{template.counter_limit})</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
