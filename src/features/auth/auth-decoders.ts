import type { AuthUser, AuthUserRole } from '@/features/auth/auth-types'
import {
  requireBoolean,
  requireEnum,
  requireNonEmptyString,
  requireRecord,
  requireTimestamp,
} from '@/lib/api/decode'

export const authUserRoles = [
  'super_admin',
  'user',
] as const satisfies readonly AuthUserRole[]

export function decodeSetupStatus(value: unknown): { required: boolean } {
  const record = requireRecord(value, 'setup status')

  return {
    required: requireBoolean(record.required, 'setup status required'),
  }
}

export function decodeAuthUser(value: unknown): AuthUser {
  const record = requireRecord(value, 'auth user')
  return {
    id: requireNonEmptyString(record.id, 'user ID'),
    username: requireNonEmptyString(record.username, 'username'),
    role: requireEnum(record.role, authUserRoles, 'auth user role'),
    enabled: requireBoolean(record.enabled, 'auth user enabled state'),
    createdAt: requireTimestamp(record.created_at, 'user creation time'),
    updatedAt: requireTimestamp(record.updated_at, 'user update time'),
  }
}
