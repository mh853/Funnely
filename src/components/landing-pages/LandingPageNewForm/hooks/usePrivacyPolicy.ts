import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLandingPageForm } from '../context'

/**
 * Hook for loading privacy policy content from database
 * Loads default privacy and marketing consent content if not provided in landing page
 * @param companyId Company ID
 * @param landingPage Existing landing page data
 */
export const usePrivacyPolicy = (companyId: string, landingPage?: any) => {
  const { actions } = useLandingPageForm()
  const supabase = createClient()

  useEffect(() => {
    async function loadPrivacyPolicy() {
      try {
        // If editing and content already exists, don't override
        if (landingPage?.privacy_content || landingPage?.marketing_content) {
          return
        }

        const { data: policy, error } = await supabase
          .from('privacy_policies')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle()

        if (error) {
          console.error('Error loading privacy policy:', error)
          return
        }

        if (policy) {
          actions.setPrivacyContent(policy.privacy_consent_content)
          actions.setMarketingContent(policy.marketing_consent_content)
        }
      } catch (err) {
        console.error('Error loading privacy policy:', err)
      }
    }

    loadPrivacyPolicy()
  }, [landingPage, companyId, actions, supabase])
}
