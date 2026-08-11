import type { UsageCacheTotals } from '@/features/usage/usage-types'
import { formatUnixMs } from '@/lib/datetime'

const countFormatter = new Intl.NumberFormat('en')
const percentFormatter = new Intl.NumberFormat('en', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export function formatUsageCount(value: number): string {
  return countFormatter.format(value)
}

// Compact counts for dense table cells (design: 1.1K, not 1,100).
export function formatUsageCompactCount(value: number): string {
  if (value < 1000) {
    return formatUsageCount(Math.round(value))
  }
  if (value < 1_000_000) {
    const kilo = value / 1000
    const digits = kilo >= 10 ? 0 : 1
    return `${trimTrailingZero(kilo.toFixed(digits))}K`
  }
  const mega = value / 1_000_000
  const digits = mega >= 10 ? 0 : 1
  return `${trimTrailingZero(mega.toFixed(digits))}M`
}

function trimTrailingZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value
}

// Usage timestamps are unix milliseconds, unlike the unix seconds every other
// endpoint in this app returns.
export function formatUsageRange(fromMs: number, toMs: number): string {
  return `${formatUnixMs(fromMs)} – ${formatUnixMs(toMs)}`
}

export function formatUsageDateTime(ms: number): string {
  return formatUnixMs(ms)
}

export function formatCacheHitRate(cache: UsageCacheTotals): string {
  return cache.reportedInputTokens > 0
    ? percentFormatter.format(
        cache.cacheReadInputTokens / cache.reportedInputTokens,
      )
    : percentFormatter.format(0)
}

const costScale = 6
const costUnit = 10n ** BigInt(costScale)
// Two decimals can only carry an amount of a cent or more.
const centThreshold = costUnit / 100n

// Amounts arrive as fixed-point decimal strings and are formatted with BigInt.
// The backend does the arithmetic as i128 precisely so the value never passes
// through a float, and rounding a small observed cost down to $0.00 would
// report something we did see as nothing at all.
export function formatUsageCost(value: string): string {
  const atoms = truncateToCostScale(value)

  if (atoms > 0n) {
    return atoms >= centThreshold
      ? renderUsd(atoms, 2)
      : renderUsd(atoms, costScale)
  }

  return /[1-9]/.test(value) ? `< ${renderUsd(1n, costScale)}` : '$0.00'
}

export function formatUsageCostDetailed(value: string): string {
  const atoms = truncateToCostScale(value)

  if (atoms > 0n) {
    return renderUsd(atoms, costScale)
  }

  return /[1-9]/.test(value) ? `< ${renderUsd(1n, costScale)}` : '$0.000000'
}

export function formatUsageWindowCost(value: string): string {
  const atoms = truncateToCostScale(value)
  const decimals = 4
  const factor = 10n ** BigInt(costScale - decimals)
  const rounded = (atoms + factor / 2n) / factor

  return renderScaledUsd(rounded, decimals)
}

export function formatUsagePrice(value: string): string {
  const [whole, fraction = ''] = value.split('.')
  const precision = fraction.padEnd(8, '0').slice(0, 8)
  const lastSignificantDigit = precision.search(/0+$/)
  const decimals = Math.max(
    4,
    lastSignificantDigit === -1 ? precision.length : lastSignificantDigit,
  )

  return `$${whole}.${precision.slice(0, decimals)} / 1M tokens`
}

// Truncates rather than rounds, so a formatted estimate never reads higher than
// what was observed. What truncation erases is reported by the caller above.
function truncateToCostScale(value: string): bigint {
  const [whole, fraction = ''] = value.split('.')

  return BigInt(`${whole}${fraction.padEnd(costScale, '0').slice(0, costScale)}`)
}

function renderUsd(atoms: bigint, decimals: number): string {
  const scaled = atoms / 10n ** BigInt(costScale - decimals)
  return renderScaledUsd(scaled, decimals)
}

function renderScaledUsd(scaled: bigint, decimals: number): string {
  const unit = 10n ** BigInt(decimals)
  const fraction = (scaled % unit).toString().padStart(decimals, '0')

  return `$${groupDigits(scaled / unit)}.${fraction}`
}

function groupDigits(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}


export function formatUsageQuota(
  spentUsd: string,
  limitUsd: string | null,
): string {
  const spent = formatUsageCost(spentUsd)
  if (limitUsd === null) {
    return `${spent} / ∞`
  }
  return `${spent} / ${formatUsageCost(limitUsd)}`
}
