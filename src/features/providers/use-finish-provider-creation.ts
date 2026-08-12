import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { providerKeys } from '@/features/providers/providers-query'
import type { CreatedProviderAccount } from '@/features/providers/provider-types'

export function useFinishProviderCreation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return (created: CreatedProviderAccount) => {
    queryClient.setQueryData(
      providerKeys.detail(created.account.id),
      created.account,
    )
    queryClient.setQueryData(
      providerKeys.models(created.account.id),
      created.models.models,
    )
    void queryClient.invalidateQueries({
      queryKey: providerKeys.all,
      exact: true,
    })
    navigate(`/providers/${encodeURIComponent(created.account.id)}`, {
      replace: true,
    })
  }
}
