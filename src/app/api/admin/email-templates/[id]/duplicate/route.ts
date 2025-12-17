// Email Templates API - Duplicate Template
// POST /api/admin/email-templates/[id]/duplicate - Clone template

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

    // Get original template
    const { data: original, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Create duplicate with modified name
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name: `${original.name} (복사본)`,
        category: original.category,
        trigger: original.trigger,
        subject: original.subject,
        html_body: original.html_body,
        text_body: original.text_body,
        variables: original.variables,
        settings: original.settings,
        schedule: original.schedule,
        is_active: false, // Deactivate duplicates by default
        created_by: adminUser.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to duplicate template:', error)
      return NextResponse.json({ error: 'Failed to duplicate template' }, { status: 500 })
    }

    return NextResponse.json({
      template: data,
      message: 'Template duplicated successfully',
    })
  } catch (error) {
    console.error('Email template duplicate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
