// 사용자 권한 체크 유틸리티

const ADMIN_ROLES = ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin']

/** simple_role 또는 role 필드 기반으로 관리자 여부 확인 */
export function isAdminUser(userProfile: { simple_role?: string | null; role?: string | null }): boolean {
  if (userProfile.simple_role === 'admin' || userProfile.simple_role === 'manager') return true
  if (userProfile.role && ADMIN_ROLES.includes(userProfile.role)) return true
  return false
}
