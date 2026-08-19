import type { AuthUserRole } from './auth-types'

export function homePathForRole(role: AuthUserRole): string {
  return role === 'super_admin' ? '/dashboard' : '/api-keys'
}

export function canAccessSuperAdminRoutes(role: AuthUserRole): boolean {
  return role === 'super_admin'
}

export function shouldClearUserScopedQueries(
  previousUserId: string | null | undefined,
  nextUserId: string | null,
): boolean {
  return typeof previousUserId === 'string' && previousUserId !== nextUserId
}
