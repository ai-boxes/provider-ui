import type {
  CreateCompatibleProviderInput,
  ImportOAuthProviderInput,
  StartProviderOAuthInput,
  UpdateProviderAccountInput,
} from '@/features/providers/provider-types'

export function createCompatibleProviderBody(
  input: CreateCompatibleProviderInput,
) {
  return {
    method: 'direct',
    provider: input.provider,
    label: input.label,
    group_label: input.groupLabel,
    priority: input.priority,
    base_url: input.baseUrl,
    api_key: input.apiKey,
    visibility: input.visibility,
  }
}

export function importOAuthProviderBody(input: ImportOAuthProviderInput) {
  return {
    method: 'credential_json',
    provider: input.provider,
    label: input.label,
    group_label: input.groupLabel,
    priority: input.priority,
    credential_json: input.credentialJson,
    visibility: input.visibility,
  }
}

export function startProviderOAuthBody(input: StartProviderOAuthInput) {
  return {
    provider: input.provider,
    label: input.label,
    group_label: input.groupLabel,
    priority: input.priority,
    visibility: input.visibility,
  }
}

export function updateProviderAccountBody(input: UpdateProviderAccountInput) {
  return {
    label: input.label,
    group_label: input.groupLabel,
    priority: input.priority,
    visibility: input.visibility,
    base_url: input.baseUrl,
    ...(input.apiKey?.trim() ? { api_key: input.apiKey.trim() } : {}),
  }
}
