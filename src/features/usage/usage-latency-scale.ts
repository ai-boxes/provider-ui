export type LatencyMetric = 'ttft' | 'total'

type LatencyScale = {
  greenMaxMs: number
  redMinMs: number
}

type LatencyIndicator = {
  color: string
  tone: 'green' | 'yellow' | 'red'
}

const LATENCY_SCALES: Record<LatencyMetric, LatencyScale> = {
  ttft: {
    greenMaxMs: 30_000,
    redMinMs: 60_000,
  },
  total: {
    greenMaxMs: 60_000,
    redMinMs: 300_000,
  },
}

const LATENCY_COLORS = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
} as const

export function latencyIndicator(
  ms: number | null,
  metric: LatencyMetric,
): LatencyIndicator | null {
  if (ms === null || ms < 0) {
    return null
  }

  const scale = LATENCY_SCALES[metric]
  const tone =
    ms < scale.greenMaxMs
      ? 'green'
      : ms < scale.redMinMs
        ? 'yellow'
        : 'red'

  return {
    color: LATENCY_COLORS[tone],
    tone,
  }
}
