import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="grid max-w-2xl gap-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
