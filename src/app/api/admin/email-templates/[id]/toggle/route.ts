// Email Templates API - Toggle Active Status
// POST /api/admin/email-templates/[id]/toggle - Activate/Deactivate template

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_EMAIL_TEMPLATES)

    const supabase = await createClient()

    // Get current template status
    const { data: template, error: fetchError } = await supabase
      .from('email_templates')
      .select('is_active')
      .eq('id', params.id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Toggle status
    const newStatus = !template.is_active

    const { data, error } = await supabase
      .from('email_templates')
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to toggle template status:', error)
      return NextResponse.json({ error: 'Failed to toggle status' }, { status: 500 })
    }

    return NextResponse.json({
      template: data,
      message: newStatus ? 'Template activated' : 'Template deactivated',
    })
  } catch (error) {
    console.error('Email template toggle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
