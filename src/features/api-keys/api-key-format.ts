import type { ApiKeySummary } from '@/features/api-keys/api-key-types'

const dateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export type ApiKeyStatus = 'active' | 'disabled' | 'expired'

export function getApiKeyStatus(
  key: ApiKeySummary,
  now = Date.now() / 1000,
): ApiKeyStatus {
  if (key.expiresAt !== null && key.expiresAt <= now) {
    return 'expired'
  }

  return key.enabled ? 'active' : 'disabled'
}

export function formatApiKeyDate(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp * 1000))
}

export function formatApiKeyDateTime(timestamp: number): string {
  return dateTimeFormatter.format(new Date(timestamp * 1000))
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
