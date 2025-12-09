'use client'

import { useState } from 'react'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import InviteUserModal from './InviteUserModal'

interface InviteUserButtonProps {
  companyId: string
  existingDepartments?: string[]
}

export default function InviteUserButton({ companyId, existingDepartments = [] }: InviteUserButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
      >
        <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
        팀원 초대
      </button>

      {showModal && (
        <InviteUserModal
          companyId={companyId}
          onClose={() => setShowModal(false)}
          existingDepartments={existingDepartments}
        />
      )}
    </>
  )
}
