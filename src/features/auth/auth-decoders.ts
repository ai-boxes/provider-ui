import type { AuthSession, AuthUser } from '@/features/auth/auth-types'

export function decodeSetupStatus(value: unknown): { required: boolean } {
  const record = requireRecord(value, 'setup status')

  if (typeof record.required !== 'boolean') {
    throw new TypeError('setup status required must be a boolean')
  }

  return { required: record.required }
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
  if (value.role !== 'super_admin' && value.role !== 'user') {
    throw new TypeError('auth user role is unsupported')
  }

  if (typeof value.enabled !== 'boolean') {
    throw new TypeError('auth user enabled must be a boolean')
  }

  return {
    id: requireNonEmptyString(value.id, 'user ID'),
    username: requireNonEmptyString(value.username, 'username'),
    role: value.role,
    enabled: value.enabled,
    createdAt: requireTimestamp(value.createdAt, 'user creation time'),
    updatedAt: requireTimestamp(value.updatedAt, 'user update time'),
  }
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }

  return value as Record<string, unknown>
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`)
  }

  return value
}

function requireTimestamp(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${label} must be a positive integer timestamp`)
  }

  return value as number
}
