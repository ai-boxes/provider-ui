export type ApiKeySummary = {
  id: string
  ownerUserId: string
  groupLabel: string
  label: string
  maskedKey: string
  enabled: boolean
  expiresAt: number | null
  quotaLimitUsd: string | null
  spentUsd: string
  quotaAccounting: 'ready' | 'indeterminate'
  lastUsedAt: number | null
  createdAt: number
  updatedAt: number
}

export type ApiKeyDetail = Omit<ApiKeySummary, 'maskedKey'> & {
  key: string
}

export type CreatedApiKey = Omit<ApiKeySummary, 'maskedKey'> & {
  key: string
}

export type CreateApiKeyInput = {
  label: string
  groupLabel: string
  expiresAt: number | null
  quotaLimitUsd: string | null
}

export type UpdateApiKeyInput = {
  keyId: string
  label?: string
  groupLabel?: string
  enabled?: boolean
  expiresAt?: number | null
  quotaLimitUsd?: string | null
}
