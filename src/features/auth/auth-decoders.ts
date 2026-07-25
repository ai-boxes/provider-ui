import type {
  AuthSession,
  AuthUser,
  AuthUserRole,
} from '@/features/auth/auth-types'
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

export function decodeAuthSession(value: unknown): AuthSession {
  const record = requireRecord(value, 'auth session')

  return {
    user: decodeAuthUser(record.user),
    accessToken: requireNonEmptyString(record.access_token, 'access token'),
    refreshToken: requireNonEmptyString(record.refresh_token, 'refresh token'),
    accessExpiresAt: requireTimestamp(
      record.access_expires_at,
      'access expiration',
    ),
    refreshExpiresAt: requireTimestamp(
      record.refresh_expires_at,
      'refresh expiration',
    ),
  }
}

export function decodeStoredAuthSession(value: unknown): AuthSession {
  const envelope = requireRecord(value, 'stored auth session')

  if (envelope.version !== 1) {
    throw new TypeError('stored auth session version is unsupported')
  }

  const session = requireRecord(envelope.session, 'stored auth session data')

  return {
    user: decodeStoredAuthUser(session.user),
    accessToken: requireNonEmptyString(session.accessToken, 'access token'),
    refreshToken: requireNonEmptyString(session.refreshToken, 'refresh token'),
    accessExpiresAt: requireTimestamp(
      session.accessExpiresAt,
      'access expiration',
    ),
    refreshExpiresAt: requireTimestamp(
      session.refreshExpiresAt,
      'refresh expiration',
    ),
  }
}

function decodeAuthUser(value: unknown): AuthUser {
  const record = requireRecord(value, 'auth user')

  return decodeUserFields({
    id: record.id,
    username: record.username,
    role: record.role,
    enabled: record.enabled,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  })
}

function decodeStoredAuthUser(value: unknown): AuthUser {
  const record = requireRecord(value, 'stored auth user')

  return decodeUserFields({
    id: record.id,
    username: record.username,
    role: record.role,
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}

function decodeUserFields(value: Record<string, unknown>): AuthUser {
  return {
    id: requireNonEmptyString(value.id, 'user ID'),
    username: requireNonEmptyString(value.username, 'username'),
    role: requireEnum(value.role, authUserRoles, 'auth user role'),
    enabled: requireBoolean(value.enabled, 'auth user enabled state'),
    createdAt: requireTimestamp(value.createdAt, 'user creation time'),
    updatedAt: requireTimestamp(value.updatedAt, 'user update time'),
  }
}
