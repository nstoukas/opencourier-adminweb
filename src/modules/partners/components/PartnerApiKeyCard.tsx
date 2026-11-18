import React, { useId, useRef, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
  useToast,
} from '@/admin-web-components'
import { useCreatePartnerApiKeyMutation, useRemovePartnerApiKeyMutation } from '@/api/partnersApi'
import type { PartnerAdminDto } from '@/backend-admin-sdk'
import { ApiKeyShownOnce } from './ApiKeyShownOnce'

// The card's sentence for a restaurant with no sign in; the key buttons point to it as their reason.
export const NO_LOGIN_NO_KEY = 'No login, so no API key.'

// "3 Dec 2026, 14:05": the co-op's time (Athens), never the browser's zone (adminweb AGENTS.md).
const keyMadeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Athens',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatKeyMade(date: Date): string {
  return `Key made ${keyMadeFormat.format(date)}`
}

// Which step the dialog shows. Kept apart from `open`, so the title does not change while Radix
// animates the dialog closed (adminweb AGENTS.md).
type DialogMode = 'confirm-new' | 'confirm-remove' | 'shown'

// Spec 0037 (AC-5, AC-13): whether the restaurant has an API key and since when, and an admin's New
// API key and Remove key. A new key is shown once; the server keeps only its hash.
export function PartnerApiKeyCard({ partner }: { partner: PartnerAdminDto }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<DialogMode>('confirm-new')
  const [shownKey, setShownKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const reasonId = useId()
  // The button that opened the dialog gets focus back when it closes (Radix does not do it here).
  const newButtonRef = useRef<HTMLButtonElement>(null)
  const removeButtonRef = useRef<HTMLButtonElement>(null)
  const openedBy = useRef<React.RefObject<HTMLButtonElement> | null>(null)
  const [createApiKey, createState] = useCreatePartnerApiKeyMutation()
  const [removeApiKey, removeState] = useRemovePartnerApiKeyMutation()

  const noLogin = !partner.userId
  const hasKey = partner.apiKeyCreatedAt !== null
  const busy = createState.isLoading || removeState.isLoading

  const openDialog = (nextMode: DialogMode, by: React.RefObject<HTMLButtonElement>) => {
    openedBy.current = by
    setMode(nextMode)
    setError('')
    setOpen(true)
  }

  const makeKey = async () => {
    setError('')
    try {
      const answer = await createApiKey({ id: partner.id }).unwrap()
      setShownKey(answer.apiKey)
      // Forget the key in the request cache at once: it stays only in this panel's state, which is
      // cleared when the dialog closes (AC-13).
      createState.reset()
      setMode('shown')
      setOpen(true)
    } catch (err: any) {
      const message = err?.message || 'Could not make a new API key.'
      if (open) {
        setError(message)
      } else {
        toast({ title: message, variant: 'destructive' })
      }
    }
  }

  const onNewKey = () => {
    openedBy.current = newButtonRef
    // A restaurant with a key is asked first, since the current key stops working at once.
    if (hasKey) {
      openDialog('confirm-new', newButtonRef)
    } else {
      void makeKey()
    }
  }

  const onRemoveConfirmed = async () => {
    setError('')
    try {
      await removeApiKey({ id: partner.id }).unwrap()
      toast({ title: `The API key of ${partner.name} is removed.` })
      setOpen(false)
    } catch (err: any) {
      setError(err?.message || 'Could not remove the API key.')
    }
  }

  const shown = mode === 'shown' && shownKey !== null
  const title =
    mode === 'shown' ? 'New API key' : mode === 'confirm-new' ? 'Replace the API key?' : 'Remove the API key?'
  const description =
    mode === 'shown'
      ? `For ${partner.name}.`
      : mode === 'confirm-new'
      ? `The current key of ${partner.name} stops working at once. Whatever uses it must be given the new key.`
      : `The key of ${partner.name} stops working at once, and no new one is made.`

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">API key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p id={reasonId} data-testid="api-key-state">
          {noLogin ? NO_LOGIN_NO_KEY : partner.apiKeyCreatedAt ? formatKeyMade(partner.apiKeyCreatedAt) : 'No API key.'}
        </p>
        <p className="text-muted-foreground">
          A key lets the restaurant's own system send orders without signing in. Most restaurants use the request app
          and need none.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            ref={newButtonRef}
            type="button"
            variant="outline"
            disabled={noLogin || busy}
            aria-describedby={noLogin ? reasonId : undefined}
            onClick={onNewKey}
          >
            {createState.isLoading && !open ? <Spinner className="mr-2" /> : null}
            New API key
          </Button>
          <Button
            ref={removeButtonRef}
            type="button"
            variant="outline"
            disabled={noLogin || !hasKey || busy}
            aria-describedby={noLogin ? reasonId : undefined}
            onClick={() => openDialog('confirm-remove', removeButtonRef)}
          >
            Remove key
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-lg"
          // The key is shown only now, so only Done closes that step: Escape and a click outside do
          // nothing there (AC-13). The two confirmations close as usual.
          onEscapeKeyDown={(event) => {
            if (shown) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (shown) event.preventDefault()
          }}
          onCloseAutoFocus={(event) => {
            // Forget the key once the dialog has closed, and give focus back to the opening button.
            setShownKey(null)
            const target = openedBy.current?.current
            if (target) {
              event.preventDefault()
              target.focus()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {error ? <div className="text-sm text-destructive font-medium">{error}</div> : null}
          {shown ? (
            <ApiKeyShownOnce apiKey={shownKey} onDone={() => setOpen(false)} />
          ) : (
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {mode === 'confirm-new' ? (
                <Button type="button" disabled={busy} onClick={() => void makeKey()}>
                  {createState.isLoading ? <Spinner className="mr-2" /> : null}
                  Make a new key
                </Button>
              ) : (
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void onRemoveConfirmed()}>
                  {removeState.isLoading ? <Spinner className="mr-2" /> : null}
                  Remove key
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
