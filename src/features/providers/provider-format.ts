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
