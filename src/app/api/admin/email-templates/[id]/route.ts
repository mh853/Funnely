// Email Templates API - Get, Update, Delete by ID
// GET /api/admin/email-templates/[id] - Get template details
// PUT /api/admin/email-templates/[id] - Update template
// DELETE /api/admin/email-templates/[id] - Delete template

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import type { EmailTemplateUpdateInput } from '@/types/email'
import { extractVariables } from '@/lib/email/template-renderer'

export async function GET(
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
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_EMAIL_TEMPLATES)

    const supabase = await createClient()

    // Get template
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      console.error('Failed to fetch email template:', error)
      return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Email template GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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
    const body: EmailTemplateUpdateInput = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.category !== undefined) updateData.category = body.category
    if (body.trigger !== undefined) updateData.trigger = body.trigger
    if (body.subject !== undefined) updateData.subject = body.subject
    if (body.html_body !== undefined) updateData.html_body = body.html_body
    if (body.text_body !== undefined) updateData.text_body = body.text_body
    if (body.settings !== undefined) updateData.settings = body.settings
    if (body.schedule !== undefined) updateData.schedule = body.schedule
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    // Re-extract variables if template content changed
    if (body.subject || body.html_body || body.text_body) {
      // Get current template
      const { data: currentTemplate } = await supabase
        .from('email_templates')
        .select('subject, html_body, text_body')
        .eq('id', params.id)
        .single()

      if (currentTemplate) {
        const subject = body.subject || currentTemplate.subject
        const htmlBody = body.html_body || currentTemplate.html_body
        const textBody = body.text_body || currentTemplate.text_body

        const subjectVars = extractVariables(subject)
        const htmlVars = extractVariables(htmlBody)
        const textVars = textBody ? extractVariables(textBody) : []

        const allVariables = Array.from(new Set([...subjectVars, ...htmlVars, ...textVars]))
        updateData.variables = allVariables
      }
    }

    // Update template
    const { data, error } = await supabase
      .from('email_templates')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      console.error('Failed to update email template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Email template PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Delete template
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Failed to delete email template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email template DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
