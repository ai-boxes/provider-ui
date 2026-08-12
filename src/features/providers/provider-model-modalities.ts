import type { ProviderModelInputModality } from '@/features/providers/provider-types'
import { requireArray, requireEnum } from '../../lib/api/decode.ts'

export const commonProviderModelInputModalities = [
  'text',
  'image',
  'pdf',
  'audio',
  'video',
] as const satisfies readonly ProviderModelInputModality[]

const modalityLabels: Record<ProviderModelInputModality, string> = {
  text: 'Text',
  image: 'image',
  pdf: 'PDF',
  audio: 'audio',
  video: 'video',
}

export function formatProviderModelInputModality(
  modality: ProviderModelInputModality,
): string {
  return modalityLabels[modality]
}

export function decodeProviderModelInputModalities(
  value: unknown,
): ProviderModelInputModality[] | null {
  if (value === null) {
    return null
  }

  const modalities = requireArray(value, 'model input modalities').map(
    (modality) =>
      requireEnum(
        modality,
        commonProviderModelInputModalities,
        'model input modality',
      ),
  )
  if (modalities.length === 0) {
    throw new TypeError('model input modalities must not be empty')
  }
  if (new Set(modalities).size !== modalities.length) {
    throw new TypeError('model input modalities must not contain duplicates')
  }
  return modalities
}

export function providerModelInputModalitiesForUpdate(
  selected: ProviderModelInputModality[],
): ProviderModelInputModality[] | null {
  return selected.length > 0 ? selected : null
}

export function formatProviderModelInputModalities(
  modalities: readonly ProviderModelInputModality[] | null,
): string {
  if (modalities === null) {
    return 'Input capability not declared'
  }

  const labels = modalities.map(formatProviderModelInputModality)
  if (labels.length === 1) {
    return `${labels[0]} input`
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]} input`
  }
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)} input`
}
