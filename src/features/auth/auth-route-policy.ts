import type { AuthUserRole } from './auth-types'

export function homePathForRole(role: AuthUserRole): string {
  return role === 'super_admin' ? '/providers' : '/api-keys'
}

export function canAccessSuperAdminRoutes(role: AuthUserRole): boolean {
  return role === 'super_admin'
}
