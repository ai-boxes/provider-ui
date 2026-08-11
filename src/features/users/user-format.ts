import type { AuthUserRole } from '@/features/auth/auth-types'
import { formatUnixSeconds } from '@/lib/datetime'

export function formatUserRole(role: AuthUserRole): string {
  return role === 'super_admin' ? 'Super admin' : 'User'
}

export function formatUserDate(timestamp: number): string {
  return formatUnixSeconds(timestamp)
}
