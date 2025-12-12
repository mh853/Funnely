import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const reportId = params.id
    const supabase = await createClient()

    const { data: report, error } = await supabase
      .from('generated_reports')
      .select(
        `
        *,
        template:report_templates(id, name, type, description),
        company:companies!generated_reports_company_id_fkey(id, name, slug),
        generated_by_user:users!generated_reports_generated_by_fkey(id, full_name, email)
      `
      )
      .eq('id', reportId)
      .single()

    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Report detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const reportId = params.id
    const supabase = await createClient()

    const { error } = await supabase
      .from('generated_reports')
      .delete()
      .eq('id', reportId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Report deletion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
