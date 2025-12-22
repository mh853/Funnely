import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLandingPageForm } from '../context'

/**
 * Hook for handling form submission (create/update landing page)
 * @param companyId Company ID
 * @param userId User ID
 * @param landingPage Existing landing page data (for edit mode)
 */
export const useFormSubmit = (companyId: string, userId: string, landingPage?: any) => {
  const { state, actions } = useLandingPageForm()
  const router = useRouter()
  const supabase = createClient()

  const handleSave = useCallback(async () => {
    actions.setSaving(true)
    actions.setError('')

    try {
      // Build collect_fields array
      const collectFields = []
      if (state.collectName) collectFields.push({ type: 'name', required: true })
      if (state.collectPhone) collectFields.push({ type: 'phone', required: true })

      // Add custom fields
      state.customFields.forEach((field) => {
        collectFields.push({
          type: field.type,
          question: field.question,
          options: field.options,
        })
      })

      const dataToSave = {
        company_id: companyId,
        slug: state.slug,
        title: state.title,
        description: state.description,
        images: state.images,
        sections: state.sections,
        collect_data: state.collectData,
        collect_fields: collectFields,
        collection_mode: state.collectionMode,
        description_enabled: state.descriptionEnabled,
        realtime_enabled: state.realtimeEnabled,
        realtime_template: state.realtimeTemplate,
        realtime_speed: state.realtimeSpeed,
        realtime_count: state.realtimeCount,
        cta_enabled: state.ctaEnabled,
        cta_text: state.ctaText,
        cta_color: state.ctaColor,
        cta_sticky_position: state.ctaStickyPosition,
        timer_enabled: state.timerEnabled,
        timer_text: state.timerText || null,
        timer_deadline: state.timerDeadline || null,
        timer_color: state.timerColor,
        timer_sticky_position: state.timerStickyPosition,
        call_button_enabled: state.callButtonEnabled,
        call_button_phone: state.callButtonPhone || null,
        call_button_color: state.callButtonColor,
        call_button_sticky_position: state.callButtonStickyPosition,
        require_privacy_consent: state.requirePrivacyConsent,
        require_marketing_consent: state.requireMarketingConsent,
        privacy_content: state.privacyContent || null,
        marketing_content: state.marketingContent || null,
        success_message: state.successMessage || null,
        completion_info_message: state.completionInfoMessage || null,
        completion_bg_image: state.completionBgImage || null,
        completion_bg_color: state.completionBgColor,
        is_active: state.isActive,
        status: state.isActive ? 'published' : 'draft',
      }

      if (landingPage) {
        // Update mode - exclude company_id and created_by
        const { company_id, ...updateData } = dataToSave

        // Prepare final update payload
        const finalUpdateData = {
          ...updateData,
          updated_at: new Date().toISOString(),
        }

        // Check authentication before UPDATE
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (!session) {
          console.error('❌ [ERROR] No active session - user not authenticated!')
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
        }

        // Update landing page (RLS handles company_id filtering)
        const { data: updateResult, error: updateError } = await supabase
          .from('landing_pages')
          .update(finalUpdateData)
          .eq('id', landingPage.id)
          .select()

        if (updateError) {
          console.error('❌ [ERROR] Update error:', updateError)
          throw updateError
        }

        if (!updateResult || updateResult.length === 0) {
          console.error('⚠️ [WARNING] UPDATE affected 0 rows - RLS may be blocking the update')
        }
      } else {
        // Create mode
        const { error: insertError } = await supabase.from('landing_pages').insert({
          ...dataToSave,
          created_by: userId,
        })

        if (insertError) throw insertError
      }

      // Revalidate the landing page cache if published
      if (state.isActive && state.slug) {
        try {
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: state.slug,
              secret: process.env.NEXT_PUBLIC_REVALIDATION_SECRET,
            }),
          })
        } catch (revalidateError) {
          console.warn('Cache revalidation failed:', revalidateError)
          // Don't block save on revalidation failure
        }
      }

      console.log('Save successful, redirecting...')
      router.push('/dashboard/landing-pages')
      router.refresh()
    } catch (err: any) {
      console.error('Save failed:', err)
      actions.setError(err.message || '저장에 실패했습니다')
    } finally {
      actions.setSaving(false)
    }
  }, [state, companyId, userId, landingPage, actions, router, supabase])

  return {
    handleSave,
    saving: state.saving,
    error: state.error,
  }
}
