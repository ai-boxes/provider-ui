export function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }

  return value as Record<string, unknown>
}

export function optionalRecord(
  value: unknown,
  label: string,
): Record<string, unknown> | null {
  if (value === null) {
    return null
  }

  return requireRecord(value, label)
}

export function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`)
  }

  return value
}

export function optionalString(value: unknown, label: string): string | null {
  if (value === null) {
    return null
  }

  return requireNonEmptyString(value, label)
}

export function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new TypeError(`${label} is unsupported`)
  }

  return value as T
}

export function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T | null {
  if (value == null) {
    return null
  }

  return requireEnum(value, allowed, label)
}

export function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`)
  }

  return value
}

export function optionalArray(value: unknown, label: string): unknown[] {
  if (value == null) {
    return []
  }

  return requireArray(value, label)
}

export function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${label} must be a boolean`)
  }

  return value
}

export function requireTimestamp(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${label} must be a positive integer timestamp`)
  }

  return value as number
}

export function optionalTimestamp(
  value: unknown,
  label: string,
): number | null {
  if (value == null) {
    return null
  }

  return requireTimestamp(value, label)
}

export function requirePositiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${label} must be a positive integer`)
  }

  return value as number
}

export function requireNonNegativeInteger(
  value: unknown,
  label: string,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${label} must be a non-negative integer`)
  }

  return value as number
}
