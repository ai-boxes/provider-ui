import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import type { ProviderModel } from '@/features/providers/provider-types'

export function ModelPricingSummary({ model }: { model: ProviderModel }) {
  const pricing = model.pricing
  if (!pricing) {
    return <span className="text-xs text-muted-foreground">Not configured</span>
  }
  const summary = <PricingComponents pricing={pricing} />

  if (pricing.tiers.length === 0) {
    return summary
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            type="button"
            className="rounded-md text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Pricing tiers for ${model.upstreamModel}`}
          />
        }
      >
        {summary}
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72 p-3">
        <p className="text-xs font-semibold text-foreground">Pricing tiers</p>
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
          USD per 1M tokens
        </p>
        <PricingTier label="Base" pricing={pricing} />
        {pricing.tiers.map((tier) => (
          <PricingTier
            key={tier.thresholdTokens}
            label={`Above ${formatTokenThreshold(tier.thresholdTokens)} context tokens`}
            pricing={tier}
          />
        ))}
      </HoverCardContent>
    </HoverCard>
  )
}

type PriceComponents = Pick<
  NonNullable<ProviderModel['pricing']>,
  | 'input'
  | 'output'
  | 'cacheRead'
  | 'cacheWrite'
  | 'reasoning'
  | 'inputAudio'
  | 'outputAudio'
>

function PricingComponents({ pricing }: { pricing: PriceComponents }) {
  const components = pricingComponents(pricing)

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {components.map(([label, value]) => (
        <span key={label} className="whitespace-nowrap text-muted-foreground">
          {label}{' '}
          <span className="font-medium tabular-nums text-foreground">
            ${trimPrice(value)}
          </span>
        </span>
      ))}
    </div>
  )
}

function PricingTier({
  label,
  pricing,
}: {
  label: string
  pricing: PriceComponents
}) {
  const components = pricingComponents(pricing)

  return (
    <div className="mt-2 border-t pt-2">
      <p className="mb-1.5 text-[0.7rem] font-medium text-foreground">{label}</p>
      <div className="grid gap-1">
        {components.map(([component, value]) => (
          <div
            key={component}
            className="flex items-baseline justify-between gap-4 text-xs"
          >
            <span className="text-muted-foreground">{component}</span>
            <span className="font-medium tabular-nums text-foreground">
              ${trimPrice(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function pricingComponents(pricing: PriceComponents): [string, string][] {
  return [
    ['Input', pricing.input],
    ['Output', pricing.output],
    ['Cache read', pricing.cacheRead],
    ['Cache write', pricing.cacheWrite],
    ['Reasoning', pricing.reasoning],
    ['Input audio', pricing.inputAudio],
    ['Output audio', pricing.outputAudio],
  ].filter((entry): entry is [string, string] => entry[1] !== null)
}

function formatTokenThreshold(value: number): string {
  if (value >= 1_000_000 && value % 1_000_000 === 0) {
    return `${value / 1_000_000}M`
  }
  if (value >= 1_000 && value % 1_000 === 0) {
    return `${value / 1_000}K`
  }
  return new Intl.NumberFormat('en-US').format(value)
}

function trimPrice(value: string): string {
  if (!value.includes('.')) return value
  return value.replace(/0+$/, '').replace(/\.$/, '')
}
