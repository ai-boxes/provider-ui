export type LatencyMetric = 'ttft' | 'total'

type LatencyScale = {
  greenMaxMs: number
  redMinMs: number
}

type LatencyIndicator = {
  color: string
  progressPercent: number
  tone: 'green' | 'yellow' | 'red'
}

const LATENCY_SCALES: Record<LatencyMetric, LatencyScale> = {
  ttft: {
    greenMaxMs: 1_000,
    redMinMs: 3_000,
  },
  total: {
    greenMaxMs: 10_000,
    redMinMs: 30_000,
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
    ms <= scale.greenMaxMs
      ? 'green'
      : ms < scale.redMinMs
        ? 'yellow'
        : 'red'

  return {
    color: LATENCY_COLORS[tone],
    progressPercent: Math.min(100, (ms / scale.redMinMs) * 100),
    tone,
  }
}
