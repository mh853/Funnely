'use client'

import { useState } from 'react'
import { PlusCircleIcon } from '@heroicons/react/24/outline'
import CreateCampaignModal from './CreateCampaignModal'

interface AdAccount {
  id: string
  platform: string
  account_name: string
  status: string
}

interface CreateCampaignButtonProps {
  adAccounts: AdAccount[]
}

export default function CreateCampaignButton({ adAccounts }: CreateCampaignButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <PlusCircleIcon className="h-5 w-5 mr-2" />
        캠페인 생성
      </button>

      {isOpen && (
        <CreateCampaignModal
          adAccounts={adAccounts}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
