'use client'

import { useState } from 'react'
import { Menu } from '@headlessui/react'
import { PlusCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

export default function ConnectAccountButton() {
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async (platform: 'meta' | 'kakao' | 'google') => {
    setConnecting(true)

    try {
      // Redirect to OAuth flow
      const response = await fetch(`/api/ad-accounts/connect/${platform}`, {
        method: 'GET',
      })

      const data = await response.json()

      if (data.authUrl) {
        // Redirect to OAuth authorization page
        window.location.href = data.authUrl
      } else {
        throw new Error('인증 URL을 받지 못했습니다.')
      }
    } catch (error) {
      console.error('Connection error:', error)
      alert('계정 연동에 실패했습니다.')
      setConnecting(false)
    }
  }

  const platforms = [
    {
      id: 'meta' as const,
      name: 'Meta Ads',
      description: 'Facebook & Instagram',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'kakao' as const,
      name: 'Kakao Moment',
      description: '카카오톡 광고',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      id: 'google' as const,
      name: 'Google Ads',
      description: '구글 검색 광고',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button
        disabled={connecting}
        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        <PlusCircleIcon className="h-5 w-5 mr-2" />
        {connecting ? '연동 중...' : '광고 계정 연동'}
        <ChevronDownIcon className="h-5 w-5 ml-2" />
      </Menu.Button>

      <Menu.Items className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="py-1">
          {platforms.map((platform) => (
            <Menu.Item key={platform.id}>
              {({ active }) => (
                <button
                  onClick={() => handleConnect(platform.id)}
                  className={`${
                    active ? 'bg-gray-50' : ''
                  } block w-full text-left px-4 py-3 text-sm`}
                >
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 h-10 w-10 ${platform.bgColor} rounded-lg flex items-center justify-center`}>
                      <span className={`${platform.color} font-bold text-lg`}>
                        {platform.name.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {platform.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {platform.description}
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </Menu.Item>
          ))}
        </div>
      </Menu.Items>
    </Menu>
  )
}
