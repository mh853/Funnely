import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/leads/payments?lead_id=xxx - 특정 리드의 결제 내역 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const leadId = searchParams.get('lead_id')

    if (!leadId) {
      return NextResponse.json({ error: { message: 'Missing lead_id' } }, { status: 400 })
    }

    // Get user's company
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Get payments for the lead
    const { data: payments, error } = await supabase
      .from('lead_payments')
      .select('*')
      .eq('lead_id', leadId)
      .eq('company_id', userProfile.company_id)
      .order('payment_date', { ascending: false })

    if (error) throw error

    // Calculate total amount
    const totalAmount = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        payments: payments || [],
        totalAmount,
      },
    })
  } catch (error: any) {
    console.error('Get payments error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to get payments' } },
      { status: 500 }
    )
  }
}

// POST /api/leads/payments - 결제 내역 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const { lead_id, amount, payment_date, notes } = body

    if (!lead_id || amount === undefined) {
      return NextResponse.json({ error: { message: 'Missing required fields' } }, { status: 400 })
    }

    // Get user's company
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Verify lead belongs to user's company
    const { data: lead } = await supabase
      .from('leads')
      .select('id, company_id')
      .eq('id', lead_id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: { message: 'Lead not found' } }, { status: 404 })
    }

    // Create payment record
    const { data: payment, error } = await supabase
      .from('lead_payments')
      .insert({
        lead_id,
        company_id: userProfile.company_id,
        amount: parseInt(amount, 10) || 0,
        payment_date: payment_date || new Date().toISOString(),
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Create audit log
    await supabase.from('payment_audit_logs').insert({
      lead_id,
      payment_id: payment.id,
      company_id: userProfile.company_id,
      action: 'create',
      new_amount: payment.amount,
      new_notes: payment.notes,
      new_payment_date: payment.payment_date,
      description: `${payment.amount.toLocaleString()}원 결제 추가`,
      created_by: user.id,
    })

    // Get updated total
    const { data: payments } = await supabase
      .from('lead_payments')
      .select('amount')
      .eq('lead_id', lead_id)

    const totalAmount = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Update leads table payment_amount with total
    await supabase
      .from('leads')
      .update({ payment_amount: totalAmount })
      .eq('id', lead_id)

    return NextResponse.json({
      success: true,
      data: {
        payment,
        totalAmount,
      },
    })
  } catch (error: any) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create payment' } },
      { status: 500 }
    )
  }
}

// DELETE /api/leads/payments - 결제 내역 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const paymentId = searchParams.get('id')

    if (!paymentId) {
      return NextResponse.json({ error: { message: 'Missing payment id' } }, { status: 400 })
    }

    // Get user's company
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Get the payment to find lead_id and details for audit
    const { data: payment } = await supabase
      .from('lead_payments')
      .select('lead_id, amount, notes, payment_date')
      .eq('id', paymentId)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!payment) {
      return NextResponse.json({ error: { message: 'Payment not found' } }, { status: 404 })
    }

    // Create audit log before delete
    await supabase.from('payment_audit_logs').insert({
      lead_id: payment.lead_id,
      payment_id: paymentId,
      company_id: userProfile.company_id,
      action: 'delete',
      old_amount: payment.amount,
      old_notes: payment.notes,
      old_payment_date: payment.payment_date,
      description: `${payment.amount.toLocaleString()}원 결제 삭제`,
      created_by: user.id,
    })

    // Delete payment
    const { error } = await supabase
      .from('lead_payments')
      .delete()
      .eq('id', paymentId)
      .eq('company_id', userProfile.company_id)

    if (error) throw error

    // Get updated total
    const { data: payments } = await supabase
      .from('lead_payments')
      .select('amount')
      .eq('lead_id', payment.lead_id)

    const totalAmount = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Update leads table payment_amount with total
    await supabase
      .from('leads')
      .update({ payment_amount: totalAmount })
      .eq('id', payment.lead_id)

    return NextResponse.json({
      success: true,
      data: {
        totalAmount,
      },
    })
  } catch (error: any) {
    console.error('Delete payment error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to delete payment' } },
      { status: 500 }
    )
  }
}

// PATCH /api/leads/payments - 결제 내역 수정
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const { id, amount, payment_date, notes } = body

    if (!id) {
      return NextResponse.json({ error: { message: 'Missing payment id' } }, { status: 400 })
    }

    // Get user's company
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Get old payment data for audit log
    const { data: oldPayment } = await supabase
      .from('lead_payments')
      .select('lead_id, amount, notes, payment_date')
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!oldPayment) {
      return NextResponse.json({ error: { message: 'Payment not found' } }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, any> = {}
    if (amount !== undefined) updateData.amount = parseInt(amount, 10) || 0
    if (payment_date !== undefined) updateData.payment_date = payment_date
    if (notes !== undefined) updateData.notes = notes

    // Update payment
    const { data: payment, error } = await supabase
      .from('lead_payments')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .select()
      .single()

    if (error) throw error

    // Create audit log for update
    const changes: string[] = []
    if (amount !== undefined && oldPayment.amount !== payment.amount) {
      changes.push(`금액: ${oldPayment.amount.toLocaleString()}원 → ${payment.amount.toLocaleString()}원`)
    }
    if (notes !== undefined && oldPayment.notes !== payment.notes) {
      changes.push(`비고: "${oldPayment.notes || '없음'}" → "${payment.notes || '없음'}"`)
    }
    if (payment_date !== undefined && oldPayment.payment_date !== payment.payment_date) {
      changes.push(`날짜 변경`)
    }

    await supabase.from('payment_audit_logs').insert({
      lead_id: payment.lead_id,
      payment_id: payment.id,
      company_id: userProfile.company_id,
      action: 'update',
      old_amount: oldPayment.amount,
      new_amount: payment.amount,
      old_notes: oldPayment.notes,
      new_notes: payment.notes,
      old_payment_date: oldPayment.payment_date,
      new_payment_date: payment.payment_date,
      description: changes.length > 0 ? `결제 수정: ${changes.join(', ')}` : '결제 수정',
      created_by: user.id,
    })

    // Get updated total
    const { data: payments } = await supabase
      .from('lead_payments')
      .select('amount')
      .eq('lead_id', payment.lead_id)

    const totalAmount = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Update leads table payment_amount with total
    await supabase
      .from('leads')
      .update({ payment_amount: totalAmount })
      .eq('id', payment.lead_id)

    return NextResponse.json({
      success: true,
      data: {
        payment,
        totalAmount,
      },
    })
  } catch (error: any) {
    console.error('Update payment error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update payment' } },
      { status: 500 }
    )
  }
}
