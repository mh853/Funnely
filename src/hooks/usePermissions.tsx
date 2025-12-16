'use client'

import { useEffect, useState } from 'react'
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/types/rbac'

/**
 * 사용자 권한을 관리하는 커스텀 훅
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: 실제 사용자 권한 가져오기
    // 현재는 임시로 빈 배열 설정
    // 추후 사용자 세션에서 권한 정보를 가져와야 함
    setPermissions([])
    setLoading(false)
  }, [])

  return {
    permissions,
    loading,
    hasPermission: (permission: string) =>
      hasPermission(permissions, permission),
    hasAnyPermission: (requiredPermissions: string[]) =>
      hasAnyPermission(permissions, requiredPermissions),
    hasAllPermissions: (requiredPermissions: string[]) =>
      hasAllPermissions(permissions, requiredPermissions),
  }
}

/**
 * 특정 권한을 가진 경우에만 컴포넌트를 렌더링하는 HOC
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string
) {
  return function PermissionGatedComponent(props: P) {
    const { hasPermission: checkPermission, loading } = usePermissions()

    if (loading) {
      return null
    }

    if (!checkPermission(requiredPermission)) {
      return null
    }

    return <Component {...props} />
  }
}

/**
 * 여러 권한 중 하나라도 가진 경우 컴포넌트 렌더링
 */
export function withAnyPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string[]
) {
  return function PermissionGatedComponent(props: P) {
    const { hasAnyPermission: checkAnyPermission, loading } = usePermissions()

    if (loading) {
      return null
    }

    if (!checkAnyPermission(requiredPermissions)) {
      return null
    }

    return <Component {...props} />
  }
}
