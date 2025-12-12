/**
 * Admin permission utilities
 * Provides functions to check super admin privileges
 */

import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'

/**
 * Check if the current user is a super admin
 * @returns Promise<boolean>
 */
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  return userProfile?.is_super_admin === true
}

/**
 * Check if a specific user is a super admin
 * @param userId - User ID to check
 * @returns Promise<boolean>
 */
export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: userProfile } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', userId)
    .single()

  return userProfile?.is_super_admin === true
}

/**
 * Require super admin access - throws error if not authorized
 * Use this in API routes or server components
 */
export async function requireSuperAdmin(): Promise<User> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized: Not authenticated')
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!userProfile?.is_super_admin) {
    throw new Error('Forbidden: Super admin access required')
  }

  return user
}

/**
 * Get super admin user with profile
 */
export async function getSuperAdminUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userProfile?.is_super_admin) {
    return null
  }

  return { user, profile: userProfile }
}
