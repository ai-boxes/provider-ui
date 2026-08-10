import type { ApiKeySummary } from '@/features/api-keys/api-key-types'
import { formatUnixSeconds } from '@/lib/datetime'

export type ApiKeyStatus =
  | 'active'
  | 'disabled'
  | 'expired'
  | 'exhausted'

export function getApiKeyStatus(
  key: ApiKeySummary,
  now = Date.now() / 1000,
): ApiKeyStatus {
  if (key.expiresAt !== null && key.expiresAt <= now) {
    return 'expired'
  }

  if (!key.enabled) {
    return 'disabled'
  }

  if (
    key.quotaLimitUsd !== null &&
    compareUnsignedDecimals(key.spentUsd, key.quotaLimitUsd) >= 0
  ) {
    return 'exhausted'
  }

  return 'active'
}

function compareUnsignedDecimals(left: string, right: string): number {
  const [leftWhole, leftFraction = ''] = normalizeDecimal(left)
  const [rightWhole, rightFraction = ''] = normalizeDecimal(right)

  if (leftWhole.length !== rightWhole.length) {
    return leftWhole.length > rightWhole.length ? 1 : -1
  }

  if (leftWhole !== rightWhole) {
    return leftWhole > rightWhole ? 1 : -1
  }

  const fractionLength = Math.max(leftFraction.length, rightFraction.length)
  const paddedLeft = leftFraction.padEnd(fractionLength, '0')
  const paddedRight = rightFraction.padEnd(fractionLength, '0')
  return paddedLeft === paddedRight ? 0 : paddedLeft > paddedRight ? 1 : -1
}

function normalizeDecimal(value: string): [string, string?] {
  const [whole = '0', fraction = ''] = value.split('.', 2)
  return [whole.replace(/^0+(?=\d)/, ''), fraction.replace(/0+$/, '')]
}

export function formatApiKeyDate(timestamp: number): string {
  return formatUnixSeconds(timestamp)
}

export function formatApiKeyDateTime(timestamp: number): string {
  return formatUnixSeconds(timestamp)
}

export function toDateTimeLocalValue(timestamp: number | null): string {
  if (timestamp === null) {
    return ''
  }

  const date = new Date(timestamp * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function dateTimeLocalToTimestamp(value: string): number | null {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null
}
