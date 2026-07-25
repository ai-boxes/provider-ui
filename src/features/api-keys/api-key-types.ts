export type ApiKeySummary = {
  id: string
  ownerUserId: string
  label: string
  maskedKey: string
  enabled: boolean
  expiresAt: number | null
  lastUsedAt: number | null
  createdAt: number
  updatedAt: number
}

export type ApiKeyDetail = Omit<ApiKeySummary, 'maskedKey'> & {
  key: string
}

export type CreateApiKeyInput = {
  label: string
  key: string
  expiresAt: number | null
}

export type UpdateApiKeyInput = {
  keyId: string
  enabled?: boolean
  expiresAt?: number | null
}
