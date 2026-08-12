import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { refreshProviderModels } from '@/features/providers/provider-api'
import { providerKeys } from '@/features/providers/providers-query'

export function ProviderModelRefreshControl({
  accountId,
}: {
  accountId: string
}) {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<string | null>(null)
  const refreshModels = useMutation({
    mutationFn: () => refreshProviderModels(accountId),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(
        providerKeys.models(accountId),
        snapshot.models,
      )
      setFeedback('Models refreshed from the upstream catalog.')
    },
    onError: () => setFeedback(null),
  })

  return (
    <div className="grid justify-items-end gap-1.5">
      <Button
        variant="outline"
        size="sm"
        disabled={refreshModels.isPending}
        onClick={() => refreshModels.mutate()}
      >
        {refreshModels.isPending ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <RefreshCwIcon />
        )}
        Refresh
      </Button>
      {refreshModels.isError ? (
        <span role="alert" className="text-right text-xs text-destructive">
          Unable to refresh models.
        </span>
      ) : feedback ? (
        <span className="max-w-56 text-right text-xs text-muted-foreground">
          {feedback}
        </span>
      ) : null}
    </div>
  )
}
