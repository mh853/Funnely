/**
 * Activity Logger
 * Logs company activities for admin monitoring and analytics
 */

import { createClient } from '@/lib/supabase/server'

export type ActivityType =
  | 'login'
  | 'logout'
  | 'lead_created'
  | 'lead_updated'
  | 'landing_page_created'
  | 'landing_page_published'
  | 'landing_page_unpublished'
  | 'form_submitted'
  | 'user_invited'
  | 'user_joined'
  | 'settings_updated'
  | 'support_ticket_created'
  | 'support_ticket_resolved'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'subscription_created'
  | 'subscription_cancelled'

interface ActivityLogParams {
  companyId: string
  userId?: string
  activityType: ActivityType
  activityDescription?: string
  metadata?: Record<string, any>
}

/**
 * Log an activity for a company
 */
export async function logActivity({
  companyId,
  userId,
  activityType,
  activityDescription,
  metadata = {},
}: ActivityLogParams): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('company_activity_logs').insert({
      company_id: companyId,
      user_id: userId || null,
      activity_type: activityType,
      activity_description: activityDescription || null,
      metadata: metadata,
    })

    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (error) {
    console.error('Activity logging error:', error)
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Helper: Log user login
 */
export async function logUserLogin(
  companyId: string,
  userId: string,
  metadata?: Record<string, any>
) {
  await logActivity({
    companyId,
    userId,
    activityType: 'login',
    activityDescription: 'User logged in',
    metadata,
  })
}

/**
 * Helper: Log lead creation
 */
export async function logLeadCreated(
  companyId: string,
  leadId: string,
  metadata?: Record<string, any>
) {
  await logActivity({
    companyId,
    activityType: 'lead_created',
    activityDescription: `New lead created: ${leadId}`,
    metadata,
  })
}

/**
 * Helper: Log landing page published
 */
export async function logLandingPagePublished(
  companyId: string,
  userId: string,
  landingPageId: string,
  landingPageTitle: string
) {
  await logActivity({
    companyId,
    userId,
    activityType: 'landing_page_published',
    activityDescription: `Landing page published: ${landingPageTitle}`,
    metadata: { landing_page_id: landingPageId },
  })
}

/**
 * Helper: Log support ticket created
 */
export async function logSupportTicketCreated(
  companyId: string,
  userId: string,
  ticketId: string,
  ticketSubject: string
) {
  await logActivity({
    companyId,
    userId,
    activityType: 'support_ticket_created',
    activityDescription: `Support ticket created: ${ticketSubject}`,
    metadata: { ticket_id: ticketId },
  })
}
