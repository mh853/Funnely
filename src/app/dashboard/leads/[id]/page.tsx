import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { decryptPhone } from '@/lib/encryption/phone'
import LeadDetails from '@/components/leads/LeadDetails'

interface Props {
  params: { id: string }
}

export default async function LeadDetailPage({ params }: Props) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get lead with all related data
  const { data: lead, error } = await supabase
    .from('leads')
    .select(
      `
      *,
      landing_pages (
        id,
        title,
        slug
      ),
      users!leads_assigned_to_fkey (
        id,
        name,
        email
      )
    `
    )
    .eq('id', params.id)
    .eq('company_id', userProfile.company_id)
    .single()

  if (error || !lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">리드를 찾을 수 없습니다.</p>
        <Link
          href="/dashboard/leads"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-500"
        >
          <ArrowLeftIcon className="mr-2 h-5 w-5" />
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  // Get lead notes
  const { data: notes } = await supabase
    .from('lead_notes')
    .select(
      `
      *,
      users (
        id,
        name
      )
    `
    )
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false })

  // Get team members for assignment
  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('company_id', userProfile.company_id)
    .eq('is_active', true)
    .in('role', ['marketing_staff', 'marketing_manager', 'hospital_admin'])
    .order('name')

  // Decrypt phone number
  const decryptedPhone = decryptPhone(lead.phone)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/leads"
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {new Date(lead.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>

      <LeadDetails
        lead={{ ...lead, phone: decryptedPhone }}
        notes={notes || []}
        teamMembers={teamMembers || []}
        currentUserId={user.id}
      />
    </div>
  )
}
