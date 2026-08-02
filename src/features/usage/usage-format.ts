import type { UsageCacheTotals } from '@/features/usage/usage-types'

const countFormatter = new Intl.NumberFormat('en')
const percentFormatter = new Intl.NumberFormat('en', {
  style: 'percent',
  maximumFractionDigits: 1,
})
const dateTimeFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatUsageCount(value: number): string {
  return countFormatter.format(value)
}

// Usage timestamps are unix milliseconds, unlike the unix seconds every other
// endpoint in this app returns.
export function formatUsageRange(fromMs: number, toMs: number): string {
  return `${dateTimeFormatter.format(new Date(fromMs))} – ${dateTimeFormatter.format(new Date(toMs))}`
}

// Measured against the coverage denominator, so reads that were expected but
// never reported stay out of the numerator without becoming misses.
export function formatCacheHitRate(cache: UsageCacheTotals): string | null {
  return cache.coverageDenominator > 0
    ? percentFormatter.format(cache.hits / cache.coverageDenominator)
    : null
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

// Truncates rather than rounds, so a formatted estimate never reads higher than
// what was observed. What truncation erases is reported by the caller above.
function truncateToCostScale(value: string): bigint {
  const [whole, fraction = ''] = value.split('.')

  return BigInt(`${whole}${fraction.padEnd(costScale, '0').slice(0, costScale)}`)
}

function renderUsd(atoms: bigint, decimals: number): string {
  const scaled = atoms / 10n ** BigInt(costScale - decimals)
  const unit = 10n ** BigInt(decimals)
  const fraction = (scaled % unit).toString().padStart(decimals, '0')

  return `$${groupDigits(scaled / unit)}.${fraction}`
}

function groupDigits(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
