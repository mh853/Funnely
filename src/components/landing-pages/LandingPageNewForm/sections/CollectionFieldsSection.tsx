'use client'

import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useLandingPageForm } from '../context'

/**
 * Collection Fields Section
 * Manages data collection settings and custom fields
 */
export default function CollectionFieldsSection() {
  const { state, actions } = useLandingPageForm()

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">DB 수집 설정</h2>
        <p className="mt-1 text-sm text-gray-600">수집할 정보를 설정하세요</p>
      </div>

      {/* Enable Data Collection */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={state.collectData}
            onChange={(e) => actions.setCollectData(e.target.checked)}
            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <div>
            <span className="text-sm font-semibold text-gray-900">DB 수집 활성화</span>
            <p className="text-xs text-gray-600 mt-0.5">
              비활성화 시 방문자 정보를 수집하지 않습니다
            </p>
          </div>
        </label>
      </div>

      {state.collectData && (
        <>
          {/* Collection Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">수집 방식</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => actions.setCollectionMode('inline')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  state.collectionMode === 'inline'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-sm text-gray-900">인라인 폼</div>
                  <div className="text-xs text-gray-600 mt-1">
                    페이지 내에 폼 표시
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => actions.setCollectionMode('external')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  state.collectionMode === 'external'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-sm text-gray-900">외부 폼</div>
                  <div className="text-xs text-gray-600 mt-1">
                    버튼 클릭 시 모달 표시
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Basic Fields */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">기본 수집 항목</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all">
                <input
                  type="checkbox"
                  checked={state.collectName}
                  onChange={(e) => actions.setCollectName(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">이름</span>
                  <p className="text-xs text-gray-500">방문자의 이름을 수집합니다</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all">
                <input
                  type="checkbox"
                  checked={state.collectPhone}
                  onChange={(e) => actions.setCollectPhone(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">전화번호</span>
                  <p className="text-xs text-gray-500">연락 가능한 전화번호를 수집합니다</p>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                커스텀 필드 ({state.customFields.length})
              </label>
              <button
                type="button"
                onClick={() => actions.setShowFieldTypeModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
              >
                <PlusIcon className="h-4 w-4" />
                필드 추가
              </button>
            </div>

            {state.customFields.length > 0 ? (
              <div className="space-y-3">
                {state.customFields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                            {field.type === 'short_answer' ? '단답형' : '객관식'}
                          </span>
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                        </div>
                        <input
                          type="text"
                          value={field.question}
                          onChange={(e) => actions.updateFieldQuestion(field.id, e.target.value)}
                          placeholder="질문을 입력하세요"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => actions.removeCustomField(field.id)}
                        className="ml-2 p-1.5 text-red-500 hover:bg-red-50 rounded transition-all"
                        title="필드 삭제"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Multiple Choice Options */}
                    {field.type === 'multiple_choice' && field.options && (
                      <div className="pl-4 space-y-2">
                        <label className="text-xs font-semibold text-gray-600">선택지</label>
                        {field.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) =>
                                actions.updateOption(field.id, optionIndex, e.target.value)
                              }
                              placeholder={`선택지 ${optionIndex + 1}`}
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            {field.options!.length > 1 && (
                              <button
                                type="button"
                                onClick={() => actions.removeOption(field.id, optionIndex)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="선택지 삭제"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => actions.addOption(field.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                        >
                          + 선택지 추가
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600">추가된 커스텀 필드가 없습니다</p>
                <p className="text-xs text-gray-500 mt-1">위의 버튼을 클릭하여 필드를 추가하세요</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Field Type Modal */}
      {state.showFieldTypeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">필드 타입 선택</h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                type="button"
                onClick={() => actions.addCustomField('short_answer')}
                className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <div className="font-semibold text-sm text-gray-900">단답형</div>
                <div className="text-xs text-gray-600 mt-1">텍스트 입력란</div>
              </button>
              <button
                type="button"
                onClick={() => actions.addCustomField('multiple_choice')}
                className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <div className="font-semibold text-sm text-gray-900">객관식</div>
                <div className="text-xs text-gray-600 mt-1">여러 선택지 중 하나 선택</div>
              </button>
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => actions.setShowFieldTypeModal(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
