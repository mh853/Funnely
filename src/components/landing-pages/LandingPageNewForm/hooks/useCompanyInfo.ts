import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLandingPageForm } from '../context'

/**
 * Hook for loading company short_id
 * Used for generating ref parameter in landing page URLs
 * @param companyId Company ID
 */
export const useCompanyInfo = (companyId: string) => {
  const { actions } = useLandingPageForm()
  const supabase = createClient()

  useEffect(() => {
    async function loadCompanyShortId() {
      try {
        const { data } = await supabase.from('companies').select('short_id').eq('id', companyId).single()

        if (data?.short_id) {
          actions.setCompanyShortId(data.short_id)
        }
      } catch (err) {
        console.error('Error loading company short_id:', err)
      }
    }

    loadCompanyShortId()
  }, [companyId, actions, supabase])
}
