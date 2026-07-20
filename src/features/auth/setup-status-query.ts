import { queryOptions } from '@tanstack/react-query'

import { getSetupStatus } from '@/features/auth/auth-api'

export const setupStatusQueryKey = ['auth', 'setup-status'] as const

export const setupStatusQueryOptions = queryOptions({
  queryKey: setupStatusQueryKey,
  queryFn: getSetupStatus,
})
