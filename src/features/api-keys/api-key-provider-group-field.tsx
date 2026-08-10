import { Loader2Icon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProviderGroupCatalog } from '@/features/api-keys/provider-group-options'

export function ApiKeyProviderGroupField({
  id,
  value,
  onChange,
  catalog,
  currentGroup,
  disabled,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  catalog: ProviderGroupCatalog
  currentGroup?: string
  disabled: boolean
  invalid: boolean
}) {
  const currentUnavailable = Boolean(
    currentGroup && !catalog.values.includes(currentGroup),
  )
  const choices = currentUnavailable && currentGroup
    ? [currentGroup, ...catalog.values]
    : catalog.values
  const selectionDisabled =
    disabled || catalog.status !== 'ready' || catalog.values.length === 0

  return (
    <>
      <Select
        value={value || null}
        onValueChange={(nextValue) => onChange(nextValue ?? '')}
        disabled={selectionDisabled}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={invalid}
        >
          <SelectValue placeholder={providerGroupPlaceholder(catalog)} />
        </SelectTrigger>
        <SelectContent align="start">
          {choices.map((group) => {
            const available = catalog.values.includes(group)
            return (
              <SelectItem key={group} value={group} disabled={!available}>
                {available ? group : `${group} (unavailable)`}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      <ProviderGroupStatus
        catalog={catalog}
        currentUnavailable={currentUnavailable}
      />
    </>
  )
}

function ProviderGroupStatus({
  catalog,
  currentUnavailable,
}: {
  catalog: ProviderGroupCatalog
  currentUnavailable: boolean
}) {
  if (catalog.status === 'loading') {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading Provider groups
      </div>
    )
  }

  if (catalog.status === 'error') {
    return (
      <div className="flex items-center justify-between gap-3 text-sm text-destructive">
        <span>Provider groups could not be loaded.</span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={catalog.refreshing}
          onClick={catalog.retry}
        >
          <RefreshCwIcon className={catalog.refreshing ? 'animate-spin' : ''} />
          Retry
        </Button>
      </div>
    )
  }

  if (catalog.values.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No enabled Provider group is available.
      </div>
    )
  }

  return (
    <div className="text-sm text-muted-foreground">
      {currentUnavailable
        ? 'The current group is unavailable. Select an enabled group to change it.'
        : 'Enabled Provider groups available to this account.'}
    </div>
  )
}

function providerGroupPlaceholder(catalog: ProviderGroupCatalog): string {
  if (catalog.status === 'loading') {
    return 'Loading groups'
  }
  if (catalog.status === 'error') {
    return 'Groups unavailable'
  }
  if (catalog.values.length === 0) {
    return 'No enabled groups'
  }
  return 'Select a group'
}
