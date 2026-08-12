import { z } from 'zod'

export const providerBaseSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.'),
  groupLabel: z
    .string()
    .trim()
    .min(1, 'Provider group is required.')
    .refine(
      (value) => [...value].length <= 64,
      'Provider group must be 64 characters or fewer.',
    ),
  visibility: z.enum(['private', 'shared']),
  priority: z
    .number({ error: 'Priority must be a non-negative integer.' })
    .int('Priority must be a non-negative integer.')
    .nonnegative('Priority must be a non-negative integer.'),
})

export const compatibleProviderSchema = providerBaseSchema.extend({
  baseUrl: z
    .string()
    .trim()
    .min(1, 'Base URL is required.')
    .refine(isHttpUrl, 'Enter an absolute HTTP or HTTPS URL with a host.'),
  apiKey: z.string().trim().min(1, 'API Key is required.'),
})

export const credentialJsonImportSchema = providerBaseSchema.extend({
  credentialJson: z
    .string()
    .trim()
    .min(1, 'Credential JSON is required.')
    .superRefine((value, context) => {
      try {
        const document = JSON.parse(value) as unknown

        if (
          typeof document !== 'object' ||
          document === null ||
          Array.isArray(document)
        ) {
          context.addIssue({
            code: 'custom',
            message: 'Credential JSON must contain a JSON object.',
          })
        }
      } catch {
        context.addIssue({
          code: 'custom',
          message: 'Credential JSON is not valid JSON.',
        })
      }
    }),
})

export type ProviderBaseValues = z.infer<typeof providerBaseSchema>
export type CompatibleProviderValues = z.infer<typeof compatibleProviderSchema>
export type CredentialJsonImportValues = z.infer<
  typeof credentialJsonImportSchema
>

export const defaultBaseValues: ProviderBaseValues = {
  label: '',
  groupLabel: '',
  visibility: 'private',
  priority: 0,
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.host
  } catch {
    return false
  }
}
