// Email Templates API - Send Test Email
// POST /api/admin/email-templates/[id]/test - Send test email

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { getEmailSender } from '@/lib/email/email-sender'

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

    // Parse request body
    const body = await request.json()
    const { to, variables } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Missing required field: to' },
        { status: 400 }
      )
    }

    // Get template
    const { data: template, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Send test email
    const emailSender = getEmailSender()
    await emailSender.sendTestEmail(template, to, variables || {})

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
    })
  } catch (error) {
    console.error('Email template test error:', error)
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
