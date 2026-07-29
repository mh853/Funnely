import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      // flowType을 지정하지 않으면 기본값 'implicit'이 되어 resetPasswordForEmail()이
      // code_challenge 없이 링크를 발급한다. 그 결과 Supabase가 PKCE `?code=` 대신
      // URL 프래그먼트(#access_token=...&type=recovery)로 리다이렉트하는데, 프래그먼트는
      // 서버로 전송되지 않아 auth/callback의 searchParams.get('code')가 항상 null이 되고
      // 세션 교환 없이 "링크가 만료되었습니다"로 끝난다. 'pkce'로 고정해 고객 셀프서비스
      // 플로우(createBrowserClient, flowType 항상 'pkce')와 동일하게 맞춘다.
      flowType: 'pkce',
    },
  })
}
