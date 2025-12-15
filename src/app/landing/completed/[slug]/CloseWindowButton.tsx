'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'

interface CloseWindowButtonProps {
  primaryColor: string
}

export default function CloseWindowButton({ primaryColor }: CloseWindowButtonProps) {
  const handleClose = () => {
    // Try to close the window
    window.close()

    // If window.close() doesn't work (e.g., page opened directly),
    // try alternative methods
    setTimeout(() => {
      // Check if window is still open
      if (!window.closed) {
        // For iOS Safari and some browsers, try closing via history
        if (window.history.length > 1) {
          window.history.back()
        } else {
          // Last resort: navigate to a blank page (cleaner than alert)
          window.location.href = 'about:blank'
        }
      }
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
