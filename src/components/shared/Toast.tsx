// 앱 전역에서 쓰는 성공/실패 토스트 알림 (alert()/개별 인라인 배너를 대체)
'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

type ToastVariant = 'success' | 'error'

interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, variant, message }])
      setTimeout(() => remove(id), AUTO_DISMISS_MS)
    },
    [remove]
  )

  const success = useCallback((message: string) => push('success', message), [push])
  const error = useCallback((message: string) => push('error', message), [push])

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg ${
              toast.variant === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.variant === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
            )}
            <p className="text-sm flex-1 whitespace-pre-line">{toast.message}</p>
            <button
              onClick={() => remove(toast.id)}
              className="flex-shrink-0 text-current opacity-60 hover:opacity-100"
            >
              <span className="sr-only">닫기</span>
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast는 ToastProvider 안에서만 사용할 수 있습니다')
  }
  return ctx
}
