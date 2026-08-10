import type { UseQueryResult } from '@tanstack/react-query'
import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import type { ApiKeySummary } from '@/features/api-keys/api-key-types'
import type { UsageFilterOptions } from '@/features/usage/usage-types'

type UsageRequestFiltersProps = {
  apiKeyId: string
  model: string
  group: string
  apiKeys: UseQueryResult<ApiKeySummary[], Error>
  filterOptions: UseQueryResult<UsageFilterOptions, Error>
  onSelectApiKey: (value: string) => void
  onSelectModel: (value: string) => void
  onSelectGroup: (value: string) => void
}

export function UsageRequestFilters({
  apiKeyId,
  model,
  group,
  apiKeys,
  filterOptions,
  onSelectApiKey,
  onSelectModel,
  onSelectGroup,
}: UsageRequestFiltersProps) {
  const apiKeyItems = apiKeys.data ?? []
  const modelOptions = filterOptions.data?.models ?? []
  const groupOptions = filterOptions.data?.groups ?? []
  const apiKeysUnavailable = apiKeys.isError && apiKeys.data === undefined
  const usageFiltersUnavailable =
    filterOptions.isError && filterOptions.data === undefined

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          aria-label="API key filter"
          aria-describedby={apiKeys.isError ? 'usage-api-key-filter-error' : undefined}
          className="h-8 w-44"
          value={apiKeyId}
          onChange={(event) => onSelectApiKey(event.target.value)}
          disabled={apiKeys.isPending || apiKeysUnavailable}
        >
          <NativeSelectOption value="">API Key</NativeSelectOption>
          {apiKeyItems.map((apiKey) => (
            <NativeSelectOption key={apiKey.id} value={apiKey.id}>
              {apiKey.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Model filter"
          aria-describedby={
            filterOptions.isError ? 'usage-model-group-filter-error' : undefined
          }
          className="h-8 w-48"
          value={model}
          onChange={(event) => onSelectModel(event.target.value)}
          disabled={filterOptions.isPending || usageFiltersUnavailable}
        >
          <NativeSelectOption value="">Model</NativeSelectOption>
          {modelOptions.map((option) => (
            <NativeSelectOption key={option} value={option}>
              {option}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Group filter"
          aria-describedby={
            filterOptions.isError ? 'usage-model-group-filter-error' : undefined
          }
          className="h-8 w-40"
          value={group}
          onChange={(event) => onSelectGroup(event.target.value)}
          disabled={filterOptions.isPending || usageFiltersUnavailable}
        >
          <NativeSelectOption value="">Group</NativeSelectOption>
          {groupOptions.map((option) => (
            <NativeSelectOption key={option} value={option}>
              {option}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {apiKeys.isError ? (
        <FilterLoadError
          id="usage-api-key-filter-error"
          message={
            apiKeys.data === undefined
              ? 'API key filter options are unavailable.'
              : 'API key filter options could not be refreshed.'
          }
          busy={apiKeys.isFetching}
          onRetry={() => void apiKeys.refetch()}
        />
      ) : null}
      {filterOptions.isError ? (
        <FilterLoadError
          id="usage-model-group-filter-error"
          message={
            filterOptions.data === undefined
              ? 'Model and group filter options are unavailable.'
              : 'Model and group filter options could not be refreshed.'
          }
          busy={filterOptions.isFetching}
          onRetry={() => void filterOptions.refetch()}
        />
      ) : null}
    </div>
  )
}

function FilterLoadError({
  id,
  message,
  busy,
  onRetry,
}: {
  id: string
  message: string
  busy: boolean
  onRetry: () => void
}) {
  return (
    <div
      id={id}
      role="status"
      className="flex min-h-7 flex-wrap items-center gap-x-2 text-xs text-muted-foreground"
    >
      <CircleAlertIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-7 px-1 text-xs"
        disabled={busy}
        onClick={onRetry}
      >
        <RefreshCwIcon
          className={busy ? 'motion-safe:animate-spin' : undefined}
          aria-hidden="true"
        />
        {busy ? 'Retrying…' : 'Retry'}
      </Button>
    </div>
  )
}
