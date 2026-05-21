import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()

    if (!name || name.trim().length < 1) {
      return NextResponse.json({ exists: false })
    }

    const supabase = createAdminClient()
    const { count } = await supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .ilike('name', name.trim())

    return NextResponse.json({ exists: (count ?? 0) > 0 })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
