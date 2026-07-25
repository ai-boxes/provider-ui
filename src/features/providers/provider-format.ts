import type {
  CompatibleProviderKind,
  OAuthProviderKind,
  ProviderKind,
} from '@/features/providers/provider-types'

const providerNames: Record<ProviderKind, string> = {
  grok: 'Grok',
  codex: 'Codex',
  openai_compatible: 'OpenAI-compatible',
  anthropic_compatible: 'Anthropic-compatible',
}

const oauthServiceNames: Record<OAuthProviderKind, string> = {
  grok: 'xAI',
  codex: 'OpenAI',
}

// Derived from the label maps so the accepted kinds cannot drift from the
// kinds the UI knows how to render.
export const providerKinds = Object.keys(
  providerNames,
) as readonly ProviderKind[]

export const oauthProviderKinds = Object.keys(
  oauthServiceNames,
) as readonly OAuthProviderKind[]

export function parseProviderKind(value: string | null): ProviderKind | null {
  return value !== null && Object.hasOwn(providerNames, value)
    ? (value as ProviderKind)
    : null
}

export function formatProviderKind(provider: ProviderKind): string {
  return providerNames[provider]
}

export function formatOAuthService(provider: OAuthProviderKind): string {
  return oauthServiceNames[provider]
}

export function isOAuthProvider(
  provider: ProviderKind,
): provider is OAuthProviderKind {
  return provider === 'grok' || provider === 'codex'
}

export function isCompatibleProvider(
  provider: ProviderKind,
): provider is CompatibleProviderKind {
  return !isOAuthProvider(provider)
}
