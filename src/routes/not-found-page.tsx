import { ArrowLeftIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          The address does not match a page in Provider.
        </p>
        <Button nativeButton={false} render={<Link to="/providers" replace />}>
          <ArrowLeftIcon />
          Back to Providers
        </Button>
      </div>
    </section>
  )
}
