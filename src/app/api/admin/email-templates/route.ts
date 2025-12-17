// Email Templates API - List and Create
// GET /api/admin/email-templates - List templates with filtering
// POST /api/admin/email-templates - Create new template

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import type { EmailTemplateCreateInput, EmailTemplateFilter } from '@/types/email'
import { extractVariables } from '@/lib/email/template-renderer'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_EMAIL_TEMPLATES)

    const supabase = await createClient()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('email_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Failed to fetch email templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({
      templates: data,
      total: count,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    })
  } catch (error) {
    console.error('Email templates GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const body: EmailTemplateCreateInput = await request.json()

    // Validate required fields
    if (!body.name || !body.subject || !body.html_body || !body.settings) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, html_body, settings' },
        { status: 400 }
      )
    }

    // Auto-extract variables from template
    const subjectVars = extractVariables(body.subject)
    const htmlVars = extractVariables(body.html_body)
    const textVars = body.text_body ? extractVariables(body.text_body) : []

    const allVariables = Array.from(new Set([...subjectVars, ...htmlVars, ...textVars]))

    // Create template
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name: body.name,
        category: body.category,
        trigger: body.trigger || {},
        subject: body.subject,
        html_body: body.html_body,
        text_body: body.text_body,
        variables: allVariables,
        settings: body.settings,
        schedule: body.schedule,
        is_active: body.is_active !== undefined ? body.is_active : true,
        created_by: adminUser.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create email template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error('Email templates POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
