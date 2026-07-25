import type { AuthUserRole } from '@/features/auth/auth-types'

const dateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
})

export function formatUserRole(role: AuthUserRole): string {
  return role === 'super_admin' ? 'Super admin' : 'User'
}

export function formatUserDate(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp * 1000))
}
