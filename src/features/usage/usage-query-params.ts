export type UsageQueryRange = {
  fromMs: number
  toMs: number
}

export type UsageQueryFilters = {
  apiKeyId?: string | null
  model?: string | null
  groupLabel?: string | null
  cursor?: string | null
}

export function usageQueryParams(
  range: UsageQueryRange,
  filters?: UsageQueryFilters,
): URLSearchParams {
  const params = new URLSearchParams({
    from_ms: String(range.fromMs),
    to_ms: String(range.toMs),
  })
  if (filters?.apiKeyId) {
    params.set('api_key_id', filters.apiKeyId)
  }
  if (filters?.model) {
    params.set('model', filters.model)
  }
  if (filters?.groupLabel) {
    params.set('group', filters.groupLabel)
  }
  if (filters?.cursor) {
    params.set('cursor', filters.cursor)
  }
  return params
}
