import { CheckIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/clipboard'

export function ApiKeySecret({ value }: { value: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )

  async function copyKey() {
    try {
      await copyText(value)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-muted/35 p-2 pl-3">
        <code className="min-w-0 flex-1 select-all break-all font-mono text-xs leading-5">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 bg-background"
          onClick={() => void copyKey()}
        >
          {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
          {copyState === 'copied' ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {copyState === 'failed' ? (
        <p role="alert" className="text-xs text-destructive">
          Clipboard access failed. Select and copy the key manually.
        </p>
      ) : null}
    </div>
  )
}
