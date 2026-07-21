import type { LucideIcon } from 'lucide-react'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

type ResourcePagePlaceholderProps = {
  description: string
  icon: LucideIcon
  title: string
}

export function ResourcePagePlaceholder({
  description,
  icon: Icon,
  title,
}: ResourcePagePlaceholderProps) {
  return (
    <section className="flex flex-1 flex-col gap-6">
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      <div className="relative flex min-h-96 flex-1 overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--border)_1px,transparent_1px)] opacity-55 [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-muted/70 to-transparent"
        />
        <Empty className="relative z-10 m-auto max-w-lg border-0 bg-transparent px-8 py-16">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-11 rounded-xl border bg-background shadow-xs [&_svg:not([class*='size-'])]:size-5"
            >
              <Icon />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>
              The application foundation is ready. Data and management actions
              will be connected in the next implementation step.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </section>
  )
}
