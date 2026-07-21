import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BotIcon,
  BracesIcon,
  CloudCogIcon,
  KeyRoundIcon,
  SparklesIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  CompatibleProviderForm,
  GrokJsonImportForm,
  GrokOAuthStartForm,
} from '@/features/providers/provider-create-forms'
import { ProviderOAuthFlow } from '@/features/providers/provider-oauth-flow'
import type { ProviderKind } from '@/features/providers/provider-types'
import { cn } from '@/lib/utils'

const providerOptions = [
  {
    value: 'grok',
    title: 'Grok',
    description: 'Connect an xAI account with OAuth or import credential JSON.',
    icon: SparklesIcon,
  },
  {
    value: 'openai_compatible',
    title: 'OpenAI-compatible',
    description:
      'Connect an upstream that implements the OpenAI Chat Completions API.',
    icon: BotIcon,
  },
  {
    value: 'anthropic_compatible',
    title: 'Anthropic-compatible',
    description:
      'Connect an upstream that implements the Anthropic Messages API.',
    icon: CloudCogIcon,
  },
] as const satisfies ReadonlyArray<{
  value: ProviderKind
  title: string
  description: string
  icon: typeof SparklesIcon
}>

export function ProviderCreate() {
  const [searchParams] = useSearchParams()
  const oauthSessionId = searchParams.get('oauth_session')
  const provider = parseProviderKind(searchParams.get('provider'))
  const grokMethod = parseGrokMethod(searchParams.get('method'))

  if (oauthSessionId) {
    return <ProviderOAuthFlow sessionId={oauthSessionId} />
  }

  if (!provider) {
    return (
      <CreateStep
        title="Choose a provider type"
        description="Select the upstream protocol and authentication flow for this provider account."
        backTo="/providers"
        backLabel="Back to providers"
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {providerOptions.map((option) => (
            <SelectionCard
              key={option.value}
              href={`/providers/new?provider=${option.value}`}
              title={option.title}
              description={option.description}
              icon={option.icon}
            />
          ))}
        </div>
      </CreateStep>
    )
  }

  if (provider === 'grok' && !grokMethod) {
    return (
      <CreateStep
        title="Connect Grok"
        description="Use the xAI device authorization flow or import an existing credential document."
        backTo="/providers/new"
        backLabel="Change provider type"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectionCard
            href="/providers/new?provider=grok&method=oauth"
            title="Connect with OAuth"
            description="Authorize this application with an xAI device code. Recommended for new accounts."
            icon={KeyRoundIcon}
            recommended
          />
          <SelectionCard
            href="/providers/new?provider=grok&method=json"
            title="Import credential JSON"
            description="Paste a credential document or load a local JSON file into an editable field."
            icon={BracesIcon}
          />
        </div>
      </CreateStep>
    )
  }

  if (provider === 'grok' && grokMethod === 'oauth') {
    return (
      <CreateStep
        title="Connect Grok with OAuth"
        description="Name the provider account and choose who can use it before starting authorization."
        backTo="/providers/new?provider=grok"
        backLabel="Change connection method"
        narrow
      >
        <GrokOAuthStartForm />
      </CreateStep>
    )
  }

  if (provider === 'grok' && grokMethod === 'json') {
    return (
      <CreateStep
        title="Import Grok credential JSON"
        description="Paste the credential document or load it from a local file, then review the editable content before creating the account."
        backTo="/providers/new?provider=grok"
        backLabel="Change connection method"
        narrow
      >
        <GrokJsonImportForm />
      </CreateStep>
    )
  }

  if (!isCompatibleProvider(provider)) {
    return null
  }

  return (
    <CreateStep
      title={`Connect ${formatProviderKind(provider)}`}
      description="Configure the upstream endpoint and optional authentication used by this provider account."
      backTo="/providers/new"
      backLabel="Change provider type"
      narrow
    >
      <CompatibleProviderForm provider={provider} />
    </CreateStep>
  )
}

function CreateStep({
  title,
  description,
  backTo,
  backLabel,
  narrow = false,
  children,
}: {
  title: string
  description: string
  backTo: string
  backLabel: string
  narrow?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full flex-1 flex-col gap-6',
        narrow ? 'max-w-2xl' : 'max-w-5xl',
      )}
    >
      <div className="grid gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-muted-foreground"
          render={<Link to={backTo} />}
        >
          <ArrowLeftIcon />
          {backLabel}
        </Button>
        <div className="grid gap-1.5">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  )
}

function SelectionCard({
  href,
  title,
  description,
  icon: Icon,
  recommended = false,
}: {
  href: string
  title: string
  description: string
  icon: typeof SparklesIcon
  recommended?: boolean
}) {
  return (
    <Link
      to={href}
      className="group relative flex min-h-40 flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs outline-none transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/45 text-muted-foreground transition-colors group-hover:text-foreground">
          <Icon className="size-5" />
        </span>
        {recommended ? (
          <span className="rounded-full bg-primary px-2 py-1 text-[0.68rem] font-medium text-primary-foreground">
            Recommended
          </span>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <ArrowRightIcon className="mt-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  )
}

function parseProviderKind(value: string | null): ProviderKind | null {
  return value === 'grok' ||
    value === 'openai_compatible' ||
    value === 'anthropic_compatible'
    ? value
    : null
}

function parseGrokMethod(value: string | null): 'oauth' | 'json' | null {
  return value === 'oauth' || value === 'json' ? value : null
}

function isCompatibleProvider(
  provider: ProviderKind,
): provider is Exclude<ProviderKind, 'grok'> {
  return (
    provider === 'openai_compatible' || provider === 'anthropic_compatible'
  )
}

function formatProviderKind(provider: Exclude<ProviderKind, 'grok'>): string {
  return provider === 'openai_compatible'
    ? 'OpenAI-compatible'
    : 'Anthropic-compatible'
}
