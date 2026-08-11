import type { PropsWithChildren } from 'react'

export function AuthPageLayout({ children }: PropsWithChildren) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/30 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(0.88_0_0/0.28)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.88_0_0/0.28)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  )
}
