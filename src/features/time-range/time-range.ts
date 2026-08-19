export type TimeRangePresetId = '5h' | '24h' | '7d' | '30d'

export type TimeRange = {
  fromMs: number
  toMs: number
}

export type TimeRangeSelection =
  | { kind: 'preset'; preset: TimeRangePresetId }
  | { kind: 'custom'; fromMs: number; toMs: number }

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs
export const maxTimeRangeMs = 90 * dayMs

export const timeRangePresets = [
  { id: '5h', label: '5h', durationMs: 5 * hourMs },
  { id: '24h', label: '24h', durationMs: dayMs },
  { id: '7d', label: '7d', durationMs: 7 * dayMs },
  { id: '30d', label: '30d', durationMs: 30 * dayMs },
] as const satisfies readonly {
  id: TimeRangePresetId
  label: string
  durationMs: number
}[]

export const defaultTimeRangeSelection: TimeRangeSelection = {
  kind: 'preset',
  preset: '5h',
}

const sharedTimeRangeStorageKey = 'provider:time-range'

export function parseTimeRangeSelection(
  params: URLSearchParams,
): TimeRangeSelection {
  const preset = params.get('window')
  const matchingPreset = timeRangePresets.find(
    (candidate) => candidate.id === preset,
  )
  if (matchingPreset) {
    return { kind: 'preset', preset: matchingPreset.id }
  }

  const fromMs = parseTimestamp(params.get('from_ms'))
  const toMs = parseTimestamp(params.get('to_ms'))
  if (
    fromMs !== null &&
    toMs !== null &&
    toMs > fromMs &&
    toMs - fromMs <= maxTimeRangeMs
  ) {
    return { kind: 'custom', fromMs, toMs }
  }

  return defaultTimeRangeSelection
}

export function resolveTimeRangeSelection(
  params: URLSearchParams,
): TimeRangeSelection {
  const parsed = parseTimeRangeSelection(params)
  return hasTimeRangeParams(params) ? parsed : readSharedTimeRangeSelection() ?? parsed
}

function hasTimeRangeParams(params: URLSearchParams): boolean {
  return params.has('window') || params.has('from_ms') || params.has('to_ms')
}

function readSharedTimeRangeSelection(): TimeRangeSelection | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.sessionStorage.getItem(sharedTimeRangeStorageKey)
    return stored === null
      ? null
      : parseTimeRangeSelection(new URLSearchParams(stored))
  } catch {
    return null
  }
}

export function rememberSharedTimeRangeSelection(
  selection: TimeRangeSelection,
): void {
  if (typeof window === 'undefined') {
    return
  }

  const params = new URLSearchParams()
  applyTimeRangeParams(params, selection)
  try {
    window.sessionStorage.setItem(sharedTimeRangeStorageKey, params.toString())
  } catch {
    // Storage can be unavailable in private browsing; the URL remains canonical.
  }
}

export function applyTimeRangeParams(
  params: URLSearchParams,
  selection: TimeRangeSelection,
): void {
  params.delete('from_ms')
  params.delete('to_ms')
  params.delete('window')

  if (selection.kind === 'preset') {
    if (selection.preset !== '5h') {
      params.set('window', selection.preset)
    }
    return
  }

  params.set('from_ms', String(selection.fromMs))
  params.set('to_ms', String(selection.toMs))
}

export function currentTimeRange(
  selection: TimeRangeSelection,
  nowMs = Date.now(),
): TimeRange {
  if (selection.kind === 'custom') {
    return { fromMs: selection.fromMs, toMs: selection.toMs }
  }

  const preset = timeRangePresets.find(
    (candidate) => candidate.id === selection.preset,
  )
  if (!preset) {
    throw new TypeError(`unknown time range preset: ${selection.preset}`)
  }
  return { fromMs: nowMs - preset.durationMs, toMs: nowMs }
}

export function timeRangeSelectionKey(selection: TimeRangeSelection): string {
  return selection.kind === 'preset'
    ? `preset:${selection.preset}`
    : `custom:${selection.fromMs}:${selection.toMs}`
}

export function timeRangeSelectionLabel(selection: TimeRangeSelection): string {
  if (selection.kind === 'preset') {
    return selection.preset
  }
  return 'Custom'
}

function parseTimestamp(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) {
    return null
  }
  const timestamp = Number(value)
  return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : null
}
