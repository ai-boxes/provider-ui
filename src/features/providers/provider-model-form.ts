import { z } from 'zod'

import {
  compareTokenThresholds,
  isSafeTokenThreshold,
  MAX_SAFE_TOKEN_THRESHOLD,
} from '@/features/providers/provider-model-pricing'
import { commonProviderModelInputModalities } from '@/features/providers/provider-model-modalities'
import type {
  ProviderModel,
  ProviderModelPricing,
} from '@/features/providers/provider-types'

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

export const modelEditSchema = z
  .object({
    alias: z.string().transform((value) => value.trim()),
    enabled: z.boolean(),
    inputModalities: z.array(z.enum(commonProviderModelInputModalities)),
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
export type ModelEditValues = z.infer<typeof modelEditSchema>

export const priceFields = [
  ['input', 'Input'],
  ['output', 'Output'],
  ['cacheRead', 'Cache read'],
  ['cacheWrite', 'Cache write'],
  ['reasoning', 'Reasoning'],
  ['inputAudio', 'Input audio'],
  ['outputAudio', 'Output audio'],
] as const

export function modelDefaultValues(model: ProviderModel): ModelEditValues {
  return {
    alias: model.alias ?? '',
    enabled: model.enabled,
    inputModalities: model.inputModalities ?? [],
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

export function pricingFromValues(values: ModelEditValues): ProviderModelPricing | null {
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

export function pricingEquals(
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
