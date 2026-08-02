import type { UsageRange, UsageWindowId } from '@/features/usage/usage-types'

const dayMs = 24 * 60 * 60 * 1000

// The widest option is exactly the retention the backend promises, which it
// accepts; anything wider is rejected, so the selector never offers one rather
// than relying on a 400 to catch it.
export const usageWindows = [
  { id: '24h', short: '24h', label: 'Last 24 hours', durationMs: dayMs },
  { id: '7d', short: '7d', label: 'Last 7 days', durationMs: 7 * dayMs },
  { id: '30d', short: '30d', label: 'Last 30 days', durationMs: 30 * dayMs },
  { id: '90d', short: '90d', label: 'Last 90 days', durationMs: 90 * dayMs },
] as const satisfies readonly {
  id: UsageWindowId
  short: string
  label: string
  durationMs: number
}[]

export const defaultUsageWindow: UsageWindowId = '24h'

export function parseUsageWindow(value: string | null): UsageWindowId {
  return (
    usageWindows.find((window) => window.id === value)?.id ?? defaultUsageWindow
  )
}

// Resolved when the request runs rather than when the component renders, so the
// query key holds only the window and an advancing clock cannot quietly turn
// caching into polling.
export function currentUsageRange(id: UsageWindowId): UsageRange {
  const toMs = Date.now()
  const window = usageWindows.find((candidate) => candidate.id === id)

  return { fromMs: toMs - (window?.durationMs ?? dayMs), toMs }
}
