'use client'

import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useLandingPageForm } from '../context'

interface ImageUploaderProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * Image Uploader Component
 * Handles hero image uploads with preview and removal
 */
export default function ImageUploader({ onUpload }: ImageUploaderProps) {
  const { state, actions } = useLandingPageForm()

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">히어로 이미지</h2>
        <p className="mt-1 text-sm text-gray-600">
          랜딩페이지 상단에 표시될 이미지를 업로드하세요 (최대 5개)
        </p>
      </div>

      {/* Upload Button */}
      <div>
        <label
          htmlFor="hero-images"
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            state.saving
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <PhotoIcon className="h-10 w-10 text-indigo-500" />
            <p className="text-sm font-semibold text-indigo-700">
              {state.saving ? '업로드 중...' : '이미지 업로드'}
            </p>
            <p className="text-xs text-indigo-600">JPG, PNG, WebP (최대 5MB)</p>
          </div>
          <input
            id="hero-images"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={onUpload}
            disabled={state.saving || state.images.length >= 5}
            className="hidden"
          />
        </label>
        {state.images.length >= 5 && (
          <p className="mt-2 text-xs text-amber-600">최대 5개까지 업로드 가능합니다</p>
        )}
      </div>

      {/* Image Preview Grid */}
      {state.images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {state.images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={image}
                  alt={`Hero ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => actions.removeImage(index)}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="이미지 삭제"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {state.images.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">아직 업로드된 이미지가 없습니다</p>
          <p className="text-xs text-gray-500 mt-1">위의 버튼을 클릭하여 이미지를 추가하세요</p>
        </div>
      )}

      {/* Image Order Info */}
      {state.images.length > 1 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">알림:</span> 이미지는 업로드한 순서대로 표시됩니다
          </p>
        </div>
      )}
    </div>
  )
}
