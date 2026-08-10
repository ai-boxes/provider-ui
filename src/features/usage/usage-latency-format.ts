export function formatUsageLatencyMs(ms: number | null): string {
  if (ms === null || ms < 0) {
    return '—'
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  if (ms < 10_000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

export function totalLatencyMs(
  startedAtMs: number,
  completedAtMs: number,
): number {
  return completedAtMs - startedAtMs
}

export function elapsedLatencyMs(
  startedAtMs: number,
  observedAtMs: number | null,
): number | null {
  if (observedAtMs === null || observedAtMs < startedAtMs) {
    return null
  }
  return observedAtMs - startedAtMs
}
