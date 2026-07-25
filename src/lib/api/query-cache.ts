import type { QueryClient } from '@tanstack/react-query'

// Patches a cached list in place after a single-item mutation, so the row
// updates without refetching the whole collection.
export function replaceListItem<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updated: T,
) {
  queryClient.setQueryData<T[]>(queryKey, (items) =>
    items?.map((item) => (item.id === updated.id ? updated : item)),
  )
}
