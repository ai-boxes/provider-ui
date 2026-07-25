import type { ManagedUser } from '@/features/users/user-types'

export function decodeManagedUsers(value: unknown): ManagedUser[] {
  if (!Array.isArray(value)) {
    throw new TypeError('users must be an array')
  }

  return value.map((user, index) =>
    decodeManagedUser(user, `user ${index + 1}`),
  )
}

export function decodeManagedUser(
  value: unknown,
  label = 'user',
): ManagedUser {
  const record = requireRecord(value, label)

  if (record.role !== 'super_admin' && record.role !== 'user') {
    throw new TypeError(`${label} role is unsupported`)
  }

  if (typeof record.enabled !== 'boolean') {
    throw new TypeError(`${label} enabled must be a boolean`)
  }

  return {
    id: requireNonEmptyString(record.id, `${label} ID`),
    username: requireNonEmptyString(record.username, `${label} username`),
    role: record.role,
    enabled: record.enabled,
    createdAt: requireTimestamp(record.created_at, `${label} creation time`),
    updatedAt: requireTimestamp(record.updated_at, `${label} update time`),
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
