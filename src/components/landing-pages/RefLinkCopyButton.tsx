'use client'

import { useState } from 'react'
import { LinkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { generateLandingPageURL } from '@/lib/utils/landing-page-url'

interface RefLinkCopyButtonProps {
  slug: string
  shortId?: string
}

export default function RefLinkCopyButton({ slug, shortId }: RefLinkCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    // Generate subdomain URL
    const url = shortId
      ? generateLandingPageURL(shortId, slug)
      : `https://funnely.co.kr/landing/${slug}`

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center px-3 sm:px-4 py-2 border border-blue-300 rounded-lg shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
      title={shortId ? `서브도메인 링크 복사 (${shortId}.funnely.co.kr)` : '링크 복사'}
    >
      {copied ? (
        <>
          <CheckIcon className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          <span className="text-green-600">복사됨</span>
        </>
      ) : (
        <>
          <LinkIcon className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {shortId ? '내 링크 복사' : '링크 복사'}
        </>
      )}
    </button>
  )
}
