import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  Loader2Icon,
  PencilIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  refreshProviderModels,
  updateProviderModel,
} from '@/features/providers/provider-api'
import { providerKeys } from '@/features/providers/providers-query'
import type { ProviderModel } from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'

const modelEditSchema = z.object({
  alias: z.string().transform((value) => value.trim()),
  enabled: z.boolean(),
})

type ModelEditValues = z.infer<typeof modelEditSchema>

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
      setFeedback(formatRefreshFeedback(snapshot.source, snapshot.warning))
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

export function ProviderModelEditDialog({
  accountId,
  model,
}: {
  accountId: string
  model: ProviderModel
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<ModelEditValues>({
    resolver: zodResolver(modelEditSchema),
    defaultValues: modelDefaultValues(model),
  })
  const updateModel = useMutation({
    mutationFn: updateProviderModel,
    onSuccess: (models) => {
      queryClient.setQueryData(providerKeys.models(accountId), models)
      setOpen(false)
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (updateModel.isPending) {
      return
    }

    setOpen(nextOpen)

    if (nextOpen) {
      form.reset(modelDefaultValues(model))
      updateModel.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Model</DialogTitle>
          <DialogDescription>
            Set the client-facing alias and whether this model can be routed.
          </DialogDescription>
        </DialogHeader>

        {updateModel.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Unable to update Model</AlertTitle>
            <AlertDescription>
              {updateModel.error instanceof ApiError
                ? updateModel.error.message
                : 'The Model could not be updated. Try again.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <form
          id={`model-edit-form-${id}`}
          onSubmit={form.handleSubmit((values) =>
            updateModel.mutate({
              accountId,
              upstreamModel: model.upstreamModel,
              alias: values.alias || undefined,
              enabled: values.enabled,
            }),
          )}
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Upstream Model</FieldLabel>
              <code className="rounded-lg border bg-muted/45 px-2.5 py-2 font-mono text-xs break-all">
                {model.upstreamModel}
              </code>
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.alias)}>
              <FieldLabel htmlFor={`model-alias-${id}`}>
                Alias <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id={`model-alias-${id}`}
                disabled={updateModel.isPending}
                aria-invalid={Boolean(form.formState.errors.alias)}
                placeholder={model.upstreamModel}
                {...form.register('alias')}
              />
              <FieldDescription>
                Empty uses the upstream model ID as the effective model name.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.alias]} />
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-3">
                <div className="grid gap-0.5">
                  <FieldLabel htmlFor={`model-enabled-${id}`}>
                    Enabled
                  </FieldLabel>
                  <FieldDescription>
                    Disabled Models are excluded from routing.
                  </FieldDescription>
                </div>
                <Controller
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <Switch
                      id={`model-enabled-${id}`}
                      checked={field.value}
                      disabled={updateModel.isPending}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={`model-edit-form-${id}`}
            disabled={updateModel.isPending}
          >
            {updateModel.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function modelDefaultValues(model: ProviderModel): ModelEditValues {
  return {
    alias: model.alias ?? '',
    enabled: model.enabled,
  }
}

function formatRefreshFeedback(
  source: 'remote' | 'cached' | 'built_in' | 'empty',
  warning: string | null,
): string {
  if (!warning && source === 'remote') {
    return 'Models refreshed from the upstream catalog.'
  }

  if (source === 'cached') {
    return 'The upstream catalog was unavailable. Cached Models were kept.'
  }

  if (source === 'built_in') {
    return 'The upstream catalog was unavailable. Built-in Models were used.'
  }

  return 'Refresh completed, but no Models are currently available.'
}
