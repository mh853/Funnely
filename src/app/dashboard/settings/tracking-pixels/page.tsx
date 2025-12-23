import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrackingPixelsClient from './TrackingPixelsClient'
import { ChartBarIcon } from '@heroicons/react/24/outline'

export default async function TrackingPixelsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/auth/login')
  }

  // Get company tracking pixels
  const { data: trackingPixels } = await supabase
    .from('tracking_pixels')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .single()

  return (
    <div className="px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">픽셀 관리</h1>
            <p className="text-xs text-gray-500 mt-0.5">광고 플랫폼 픽셀 ID를 설정하고 관리합니다</p>
          </div>
        </div>
      </div>

      {/* Pixel Settings Form */}
      <TrackingPixelsClient
        companyId={userProfile.company_id}
        initialData={trackingPixels}
      />
    </div>
  )
}
