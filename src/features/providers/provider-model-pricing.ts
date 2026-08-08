export const MAX_SAFE_TOKEN_THRESHOLD = Number.MAX_SAFE_INTEGER

const wholeTokenCount = /^(?:0|[1-9]\d*)$/

export function isSafeTokenThreshold(value: string): boolean {
  return (
    wholeTokenCount.test(value) &&
    BigInt(value) <= BigInt(MAX_SAFE_TOKEN_THRESHOLD)
  )
}

export function compareTokenThresholds(left: string, right: string): number {
  const leftValue = BigInt(left)
  const rightValue = BigInt(right)
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
}
