import { queryOptions } from '@tanstack/react-query'

import { getUsers } from '@/features/users/user-api'

export const userKeys = {
  all: ['users'] as const,
}

export const usersQueryOptions = queryOptions({
  queryKey: userKeys.all,
  queryFn: getUsers,
})
