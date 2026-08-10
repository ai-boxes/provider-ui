import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
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
import {
  compareTokenThresholds,
  isSafeTokenThreshold,
  MAX_SAFE_TOKEN_THRESHOLD,
} from '@/features/providers/provider-model-pricing'
import { providerKeys } from '@/features/providers/providers-query'
import type {
  ProviderModel,
  ProviderModelPricing,
} from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'

const decimalPriceSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(value),
    'Enter a non-negative decimal with up to 8 decimal places.',
  )

const pricingTierSchema = z.object({
  thresholdTokens: z
    .string()
    .trim()
    .regex(/^(?:0|[1-9]\d*)$/, 'Enter a non-negative whole token count.')
    .refine(
      (value) => !/^(?:0|[1-9]\d*)$/.test(value) || isSafeTokenThreshold(value),
      `Enter no more than ${MAX_SAFE_TOKEN_THRESHOLD}.`,
    ),
  input: decimalPriceSchema,
  output: decimalPriceSchema,
  cacheRead: decimalPriceSchema,
  cacheWrite: decimalPriceSchema,
  reasoning: decimalPriceSchema,
  inputAudio: decimalPriceSchema,
  outputAudio: decimalPriceSchema,
})

const modelEditSchema = z
  .object({
    alias: z.string().transform((value) => value.trim()),
    enabled: z.boolean(),
    input: decimalPriceSchema,
    output: decimalPriceSchema,
    cacheRead: decimalPriceSchema,
    cacheWrite: decimalPriceSchema,
    reasoning: decimalPriceSchema,
    inputAudio: decimalPriceSchema,
    outputAudio: decimalPriceSchema,
    tiers: z.array(pricingTierSchema),
  })
  .superRefine((values, context) => {
    if (values.tiers.length > 0 && !hasAnyPrice(values)) {
      context.addIssue({
        code: 'custom',
        path: ['input'],
        message: 'Set at least one base price before adding tiers.',
      })
    }
    values.tiers.forEach((tier, index) => {
      if (!hasAnyPrice(tier)) {
        context.addIssue({
          code: 'custom',
          path: ['tiers', index, 'input'],
          message: 'Set at least one price for this tier.',
        })
      }
      const previousThreshold = values.tiers[index - 1]?.thresholdTokens
      if (
        index > 0 &&
        previousThreshold !== undefined &&
        isSafeTokenThreshold(tier.thresholdTokens) &&
        isSafeTokenThreshold(previousThreshold) &&
        compareTokenThresholds(
          tier.thresholdTokens,
          previousThreshold,
        ) <= 0
      ) {
        context.addIssue({
          code: 'custom',
          path: ['tiers', index, 'thresholdTokens'],
          message: 'Threshold must be greater than the previous tier.',
        })
      }
    })
  })

function hasAnyPrice(value: {
  input: string
  output: string
  cacheRead: string
  cacheWrite: string
  reasoning: string
  inputAudio: string
  outputAudio: string
}): boolean {
  return Boolean(
    value.input ||
    value.output ||
    value.cacheRead ||
    value.cacheWrite ||
    value.reasoning ||
    value.inputAudio ||
    value.outputAudio,
  )
}

type ModelEditValues = z.infer<typeof modelEditSchema>

const priceFields = [
  ['input', 'Input'],
  ['output', 'Output'],
  ['cacheRead', 'Cache read'],
  ['cacheWrite', 'Cache write'],
  ['reasoning', 'Reasoning'],
  ['inputAudio', 'Input audio'],
  ['outputAudio', 'Output audio'],
] as const

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
          <DialogDescription>
            Set the alias, routing status, and pricing in USD per 1M tokens.
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
          onSubmit={form.handleSubmit((values) => {
            const pricing = pricingFromValues(values)
            const pricingChanged = !pricingEquals(pricing, model.pricing)

            updateModel.mutate({
              accountId,
              upstreamModel: model.upstreamModel,
              alias: values.alias || undefined,
              enabled: values.enabled,
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

function modelDefaultValues(model: ProviderModel): ModelEditValues {
  return {
    alias: model.alias ?? '',
    enabled: model.enabled,
    input: model.pricing?.input ?? '',
    output: model.pricing?.output ?? '',
    cacheRead: model.pricing?.cacheRead ?? '',
    cacheWrite: model.pricing?.cacheWrite ?? '',
    reasoning: model.pricing?.reasoning ?? '',
    inputAudio: model.pricing?.inputAudio ?? '',
    outputAudio: model.pricing?.outputAudio ?? '',
    tiers:
      model.pricing?.tiers.map((tier) => ({
        thresholdTokens: String(tier.thresholdTokens),
        input: tier.input ?? '',
        output: tier.output ?? '',
        cacheRead: tier.cacheRead ?? '',
        cacheWrite: tier.cacheWrite ?? '',
        reasoning: tier.reasoning ?? '',
        inputAudio: tier.inputAudio ?? '',
        outputAudio: tier.outputAudio ?? '',
      })) ?? [],
  }
}

function pricingFromValues(values: ModelEditValues): ProviderModelPricing | null {
  const optional = (value: string) => value || null
  const pricing: ProviderModelPricing = {
    input: optional(values.input),
    output: optional(values.output),
    cacheRead: optional(values.cacheRead),
    cacheWrite: optional(values.cacheWrite),
    reasoning: optional(values.reasoning),
    inputAudio: optional(values.inputAudio),
    outputAudio: optional(values.outputAudio),
    tiers: values.tiers.map((tier) => ({
      thresholdTokens: Number(tier.thresholdTokens),
      input: optional(tier.input),
      output: optional(tier.output),
      cacheRead: optional(tier.cacheRead),
      cacheWrite: optional(tier.cacheWrite),
      reasoning: optional(tier.reasoning),
      inputAudio: optional(tier.inputAudio),
      outputAudio: optional(tier.outputAudio),
    })),
  }

  return basePriceValues(pricing).some((value) => value !== null) ||
    pricing.tiers.length > 0
    ? pricing
    : null
}

function pricingEquals(
  next: ProviderModelPricing | null,
  current: ProviderModelPricing | null,
): boolean {
  return JSON.stringify(next) === JSON.stringify(current)
}

function basePriceValues(pricing: ProviderModelPricing | null) {
  return [
    pricing?.input ?? null,
    pricing?.output ?? null,
    pricing?.cacheRead ?? null,
    pricing?.cacheWrite ?? null,
    pricing?.reasoning ?? null,
    pricing?.inputAudio ?? null,
    pricing?.outputAudio ?? null,
  ]
}
