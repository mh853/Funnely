// 사용자 권한 체크 유틸리티
//
// 이 파일엔 관리자 판정 함수가 두 종류(wide/strict) 있다 - 하나로 통일하면 안 된다.
// wide(isAdminUser)는 manager도 관리자로 인정하고, strict(isAdminOrLegacyOwner)는
// admin만 인정해 RLS의 am_i_admin_or_legacy_owner()와 범위를 맞춘다. 어느 쪽을 쓸지는
// 게이트하는 동작의 민감도로 정한다 - 실제 상태변경(특히 서비스롤 클라이언트라 앱 코드가
// 유일한 인가 장치인 결제 라우트)은 strict, 화면 노출/네비게이션은 wide.
// 전례: dashboard/settings/page.tsx의 canEdit(strict, "RLS 정책과 동일한 범위로 맞춤")과
// isAdmin(wide, 링크 노출용)이 같은 파일에서 나란히 쓰인다.

const ADMIN_ROLES = ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin']

/**
 * wide: manager도 관리자로 인정. 화면/링크 노출처럼 눌러도 그 안에서 다시 걸러지는
 * 곳에 쓴다. simple_role='manager' 계정이 실제 관리자인데도 차단되던 버그(2026-06-26,
 * a4e05e5)를 고치려고 도입됐다 - 이 조건을 빼면 그 버그가 재발한다.
 */
export function isAdminUser(userProfile: { simple_role?: string | null; role?: string | null }): boolean {
  if (userProfile.simple_role === 'admin' || userProfile.simple_role === 'manager') return true
  if (userProfile.role && ADMIN_ROLES.includes(userProfile.role)) return true
  return false
}

/**
 * strict: admin만 관리자로 인정, manager는 제외. RLS의 am_i_admin_or_legacy_owner()와
 * 범위를 맞춘 것이다 - 실제 상태변경을 게이트하는 곳, 특히 서비스롤 클라이언트를 써서
 * 이 앱 코드 체크가 유일한 인가 장치인 결제 라우트(proxy-billing-auth, convert-trial 등)
 * 에 쓴다. 여기에 wide를 쓰면 manager가 결제를 트리거할 수 있게 된다.
 */
export function isAdminOrLegacyOwner(userProfile: { simple_role?: string | null; role?: string | null }): boolean {
  if (userProfile.simple_role === 'admin') return true
  if (userProfile.role && ADMIN_ROLES.includes(userProfile.role)) return true
  return false
}
