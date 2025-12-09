'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'

interface CloseWindowButtonProps {
  primaryColor: string
}

export default function CloseWindowButton({ primaryColor }: CloseWindowButtonProps) {
  const handleClose = () => {
    window.close()
    // window.close()가 작동하지 않을 경우 (직접 URL 입력 등)
    // 사용자에게 안내 메시지 표시
    setTimeout(() => {
      alert('브라우저의 탭 닫기 버튼을 사용하여 창을 닫아주세요.')
    }, 100)
  }

  return (
    <button
      onClick={handleClose}
      className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium text-white transition-all hover:opacity-90 hover:shadow-lg"
      style={{ backgroundColor: primaryColor }}
    >
      <XMarkIcon className="w-4 h-4 mr-2" />
      창 닫기
    </button>
  )
}
