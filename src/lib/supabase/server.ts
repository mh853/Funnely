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
