// 구독 변경 API 공통 인가 - 세션 사용자를 서비스 롤로 조회해 회사 owner/admin만 통과시킨다 (노션 36번)
import { createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'

type Denied = { error: string; status: 403 | 404 }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Allowed = { db: any; companyId: string }

/**
 * company_subscriptions 쓰기는 서비스 롤로만 수행한다(RLS에서 클라이언트 쓰기 정책
 * company_subscriptions_admin 제거). 그래서 이 함수의 역할 검사가 각 라우트의 유일한
 * 인가 장치다 - strict(admin/owner만, manager 제외, permissions.ts 참고)를 쓰고, 제거한
 * RLS 정책과 같은 범위가 되도록 users.is_active도 본다.
 */
export async function requireSubscriptionAdmin(userId: string): Promise<Allowed | Denied> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data: profile } = await db
    .from('users')
    .select('company_id, role, simple_role, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.company_id) {
    return { error: '사용자 정보를 찾을 수 없습니다.', status: 404 }
  }
  // users.is_active는 nullable - 제거한 RLS 정책(is_active = true)과 같은 범위로 null도 거부
  if (profile.is_active !== true || !isAdminOrLegacyOwner(profile)) {
    return { error: '권한이 없습니다.', status: 403 }
  }
  return { db, companyId: profile.company_id as string }
}
