/**
 * Supabase Client - Server Side
 * For use in Server Components, Server Actions, and Route Handlers
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Service Role Client for admin operations
 * Use sparingly and only for trusted server-side operations
 */
export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for service role
        },
      },
    }
  )
}

/**
 * Cached auth.getUser() — layout.tsx와 그 아래 page.tsx는 같은 요청/렌더 패스에서
 * 실행되는데도 각자 supabase.auth.getUser()를 따로 호출해 매번 별도 네트워크
 * 왕복이 발생하고 있었다. React cache()로 요청 1건당 1회만 실행되게 한다.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  return supabase.auth.getUser()
})

/**
 * Cached company_subscriptions 조회 — 같은 요청 안에서 layout.tsx(플랜 기능/배너/헤더 배지),
 * subscription-access.ts(hasFeatureAccess/canCreateLandingPage/canInviteUser), 설정 페이지가
 * 각자 거의 동일한 company_id/정렬/limit(10) 조건으로 company_subscriptions를 따로 조회하고
 * 있었다. 컬럼을 모든 소비자가 필요로 하는 만큼 넓게 select해 하나로 합치고 React cache()로
 * 요청당 1회만 실행되게 한다. 반환값은 원본 행 배열 그대로이며, 어떤 행을 "현재 구독"으로
 * 볼지는 호출부가 각자 pickCurrentSubscription()으로 판단한다 — 우선순위 로직 자체는
 * 바뀌지 않는다.
 */
export const getCachedCompanySubscriptions = cache(async (companyId: string) => {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('company_subscriptions')
    .select(
      `
      id,
      plan_id,
      status,
      billing_cycle,
      current_period_end,
      grace_period_end,
      trial_end_date,
      cancelled_at,
      subscription_plans!plan_id (
        id,
        name,
        features,
        price_monthly,
        price_yearly,
        max_users,
        max_landing_pages
      )
    `
    )
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10)

  return data ?? []
})

/**
 * Cached function to get user profile with hospital info
 * Reduces duplicate queries across layout and pages
 */
export const getCachedUserProfile = cache(async (userId: string) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      companies (
        id,
        name,
        business_number,
        address,
        phone
      )
    `)
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
})
