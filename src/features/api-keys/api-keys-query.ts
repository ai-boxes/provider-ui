import { queryOptions } from '@tanstack/react-query'

import { getApiKeys } from '@/features/api-keys/api-key-api'

export const apiKeyKeys = {
  all: ['api-keys'] as const,
}

export const apiKeysQueryOptions = queryOptions({
  queryKey: apiKeyKeys.all,
  queryFn: getApiKeys,
})
