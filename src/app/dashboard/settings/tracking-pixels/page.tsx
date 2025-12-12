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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <ChartBarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">픽셀 관리</h1>
            <p className="mt-1 text-sm text-indigo-100">
              광고 플랫폼 픽셀 ID를 설정하고 관리합니다
            </p>
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
