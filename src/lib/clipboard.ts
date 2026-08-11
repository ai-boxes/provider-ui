// Clipboard API is only available in secure contexts (https / localhost). This
// UI is commonly opened over plain http on a LAN/Tailscale IP, so fall back to
// a user-gesture execCommand path that still works there.
export async function copyText(value: string): Promise<void> {
  if (
    typeof navigator !== 'undefined' &&
    window.isSecureContext &&
    navigator.clipboard?.writeText
  ) {
    await navigator.clipboard.writeText(value)
    return
  }

  copyTextWithExecCommand(value)
}

function copyTextWithExecCommand(value: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.padding = '0'
  textarea.style.border = 'none'
  textarea.style.outline = 'none'
  textarea.style.boxShadow = 'none'
  textarea.style.background = 'transparent'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  const selection = document.getSelection()
  const previousRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, value.length)

  let copied = false
  try {
    copied = document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
    if (selection) {
      selection.removeAllRanges()
      if (previousRange) {
        selection.addRange(previousRange)
      }
    }
  }

  if (!copied) {
    throw new Error('execCommand copy failed')
  }
}
