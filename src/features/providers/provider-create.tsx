import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BotIcon,
  BracesIcon,
  CloudCogIcon,
  Code2Icon,
  KeyRoundIcon,
  SparklesIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { CompatibleProviderForm } from '@/features/providers/compatible-provider-form'
import { ProviderJsonImportForm } from '@/features/providers/provider-json-import-form'
import { ProviderOAuthStartForm } from '@/features/providers/provider-oauth-start-form'
import {
  formatOAuthService,
  formatProviderKind,
  isCompatibleProvider,
  isOAuthProvider,
  parseProviderKind,
} from '@/features/providers/provider-format'
import { ProviderOAuthFlow } from '@/features/providers/provider-oauth-flow'
import type { ProviderKind } from '@/features/providers/provider-types'
import { cn } from '@/lib/utils'

const providerOptions = [
  {
    value: 'grok',
    title: 'Grok',
    description: 'xAI account via OAuth or JSON.',
    icon: SparklesIcon,
  },
  {
    value: 'codex',
    title: 'Codex',
    description: 'Codex subscription via OAuth or JSON.',
    icon: Code2Icon,
  },
  {
    value: 'openai_compatible',
    title: 'OpenAI-compatible',
    description: 'OpenAI Chat Completions endpoint.',
    icon: BotIcon,
  },
  {
    value: 'anthropic_compatible',
    title: 'Anthropic-compatible',
    description: 'Anthropic Messages endpoint.',
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
  const oauthMethod = parseOAuthMethod(searchParams.get('method'))

  if (oauthSessionId) {
    return (
      <ProviderOAuthFlow
        sessionId={oauthSessionId}
        provider={provider && isOAuthProvider(provider) ? provider : undefined}
      />
    )
  }

  if (!provider) {
    return (
      <CreateStep
        title="Choose a provider type"
        description="Select a provider type."
        backTo="/providers"
        backLabel="Back to providers"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

  if (isOAuthProvider(provider) && !oauthMethod) {
    const providerLabel = formatProviderKind(provider)
    const serviceLabel = formatOAuthService(provider)

    return (
      <CreateStep
        title={`Connect ${providerLabel}`}
        description="Choose a connection method."
        backTo="/providers/new"
        backLabel="Change provider type"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectionCard
            href={`/providers/new?provider=${provider}&method=oauth`}
            title="Connect with OAuth"
            description={`${serviceLabel} device authorization.`}
            icon={KeyRoundIcon}
            recommended
          />
          <SelectionCard
            href={`/providers/new?provider=${provider}&method=json`}
            title="Import credential JSON"
            description="Use an existing credential document."
            icon={BracesIcon}
          />
        </div>
      </CreateStep>
    )
  }

  if (isOAuthProvider(provider) && oauthMethod === 'oauth') {
    return (
      <CreateStep
        title={`Connect ${formatProviderKind(provider)} with OAuth`}
        description="Configure the account before authorization."
        backTo={`/providers/new?provider=${provider}`}
        backLabel="Change connection method"
        narrow
      >
        <ProviderOAuthStartForm provider={provider} />
      </CreateStep>
    )
  }

  if (isOAuthProvider(provider) && oauthMethod === 'json') {
    return (
      <CreateStep
        title={`Import ${formatProviderKind(provider)} credential JSON`}
        description="Review and import the credential JSON."
        backTo={`/providers/new?provider=${provider}`}
        backLabel="Change connection method"
        narrow
      >
        <ProviderJsonImportForm provider={provider} />
      </CreateStep>
    )
  }

  if (!isCompatibleProvider(provider)) {
    return null
  }

  return (
    <CreateStep
      title={`Connect ${formatProviderKind(provider)}`}
      description="Configure the endpoint and API key."
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
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-muted-foreground"
          render={<Link to={backTo} />}
        >
          <ArrowLeftIcon />
          {backLabel}
        </Button>
        <div className="grid gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">{title}</h1>
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
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <ArrowRightIcon className="mt-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  )
}

function parseOAuthMethod(value: string | null): 'oauth' | 'json' | null {
  return value === 'oauth' || value === 'json' ? value : null
}
