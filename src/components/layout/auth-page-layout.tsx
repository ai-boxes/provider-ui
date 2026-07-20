import type { PropsWithChildren } from 'react'

export function AuthPageLayout({ children }: PropsWithChildren) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}
