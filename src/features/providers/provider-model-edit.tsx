import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { updateProviderModel } from '@/features/providers/provider-api'
import {
  modelDefaultValues,
  modelEditSchema,
  priceFields,
  pricingEquals,
  pricingFromValues,
  type ModelEditValues,
} from '@/features/providers/provider-model-form'
import {
  commonProviderModelInputModalities,
  formatProviderModelInputModality,
  providerModelInputModalitiesForUpdate,
} from '@/features/providers/provider-model-modalities'
import { providerKeys } from '@/features/providers/providers-query'
import type { ProviderModel } from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'

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
  const tiers = useFieldArray({ control: form.control, name: 'tiers' })
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Model</DialogTitle>
          <DialogDescription>Update model settings.</DialogDescription>
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
          onSubmit={form.handleSubmit((values) => {
            const pricing = pricingFromValues(values)
            const pricingChanged = !pricingEquals(pricing, model.pricing)

            updateModel.mutate({
              accountId,
              upstreamModel: model.upstreamModel,
              alias: values.alias || undefined,
              enabled: values.enabled,
              inputModalities: providerModelInputModalitiesForUpdate(
                values.inputModalities,
              ),
              pricingChanged,
              pricing,
            })
          })}
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
              <FieldDescription>Empty uses the upstream model ID.</FieldDescription>
              <FieldError errors={[form.formState.errors.alias]} />
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-3">
                <div className="grid gap-0.5">
                  <FieldLabel htmlFor={`model-enabled-${id}`}>
                    Enabled
                  </FieldLabel>
                  <FieldDescription>Disabled models are not routed.</FieldDescription>
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

            <FieldSet className="gap-2">
              <FieldLegend variant="label">Input capabilities</FieldLegend>
              <Controller
                control={form.control}
                name="inputModalities"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3 rounded-lg border px-3 py-3 sm:grid-cols-3">
                    {commonProviderModelInputModalities.map((modality, index) => {
                      const checkboxId = `model-input-modality-${index}-${id}`
                      return (
                        <label
                          key={modality}
                          htmlFor={checkboxId}
                          className="flex min-w-0 items-center gap-2 text-sm"
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={field.value.includes(modality)}
                            disabled={updateModel.isPending}
                            onCheckedChange={(checked) => {
                              field.onChange(
                                checked
                                  ? [...field.value, modality]
                                  : field.value.filter(
                                      (selected) => selected !== modality,
                                    ),
                              )
                            }}
                          />
                          <span className="break-all" translate="no">
                            {formatProviderModelInputModality(modality)}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              />
              <FieldDescription>Clear all to leave unspecified.</FieldDescription>
            </FieldSet>

            <div className="grid gap-1">
              <p className="text-sm font-medium">Pricing</p>
              <p className="text-xs text-muted-foreground">
                USD per 1M tokens. Empty fields are not priced.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {priceFields.map(([name, label]) => (
                <Field
                  key={name}
                  data-invalid={Boolean(form.formState.errors[name])}
                >
                  <FieldLabel htmlFor={`model-price-${name}-${id}`}>
                    {label}
                  </FieldLabel>
                  <Input
                    id={`model-price-${name}-${id}`}
                    inputMode="decimal"
                    placeholder="Not set"
                    disabled={updateModel.isPending}
                    aria-invalid={Boolean(form.formState.errors[name])}
                    {...form.register(name)}
                  />
                  <FieldError errors={[form.formState.errors[name]]} />
                </Field>
              ))}
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Pricing tiers</p>
                  <p className="text-xs text-muted-foreground">
                    Thresholds must be strictly increasing.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={updateModel.isPending}
                  onClick={() =>
                    tiers.append({
                      thresholdTokens: '',
                      input: '',
                      output: '',
                      cacheRead: '',
                      cacheWrite: '',
                      reasoning: '',
                      inputAudio: '',
                      outputAudio: '',
                    })
                  }
                >
                  <PlusIcon />
                  Add tier
                </Button>
              </div>
              {tiers.fields.map((tier, index) => (
                <div key={tier.id} className="grid gap-4 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Tier {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={updateModel.isPending}
                      aria-label={`Remove pricing tier ${index + 1}`}
                      onClick={() => tiers.remove(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <Field
                    data-invalid={Boolean(
                      form.formState.errors.tiers?.[index]?.thresholdTokens,
                    )}
                  >
                    <FieldLabel htmlFor={`model-tier-threshold-${index}-${id}`}>
                      Context threshold tokens
                    </FieldLabel>
                    <Input
                      id={`model-tier-threshold-${index}-${id}`}
                      inputMode="numeric"
                      disabled={updateModel.isPending}
                      aria-invalid={Boolean(
                        form.formState.errors.tiers?.[index]?.thresholdTokens,
                      )}
                      {...form.register(`tiers.${index}.thresholdTokens`)}
                    />
                    <FieldError
                      errors={[
                        form.formState.errors.tiers?.[index]?.thresholdTokens,
                      ]}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {priceFields.map(([name, label]) => (
                      <Field
                        key={name}
                        data-invalid={Boolean(
                          form.formState.errors.tiers?.[index]?.[name],
                        )}
                      >
                        <FieldLabel htmlFor={`model-tier-${index}-${name}-${id}`}>
                          {label}
                        </FieldLabel>
                        <Input
                          id={`model-tier-${index}-${name}-${id}`}
                          inputMode="decimal"
                          placeholder="Not set"
                          disabled={updateModel.isPending}
                          aria-invalid={Boolean(
                            form.formState.errors.tiers?.[index]?.[name],
                          )}
                          {...form.register(`tiers.${index}.${name}`)}
                        />
                        <FieldError
                          errors={[form.formState.errors.tiers?.[index]?.[name]]}
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose
            disabled={updateModel.isPending}
            render={
              <Button variant="outline" disabled={updateModel.isPending} />
            }
          >
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
