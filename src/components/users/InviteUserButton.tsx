'use client'

import { useState } from 'react'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import InviteUserModal from './InviteUserModal'

interface InviteUserButtonProps {
  companyId: string
}

export default function InviteUserButton({ companyId }: InviteUserButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
        팀원 초대
      </button>

      {showModal && (
        <InviteUserModal
          companyId={companyId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
