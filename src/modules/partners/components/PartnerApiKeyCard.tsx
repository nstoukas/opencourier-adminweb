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
import { useTranslation } from 'react-i18next'
// TFunction is the type of t, so a plain helper can take it as a parameter.
import type { TFunction } from 'i18next'
import { useServerText } from '@/i18n/useServerText'
import { useFormat, type Formats } from '@/i18n/useFormat'

// The translation key of the card's sentence for a restaurant with no sign in; the key buttons point
// to it as their reason. A key, not words, so it reads in the admin's language (spec 0054).
export const NO_LOGIN_NO_KEY = 'partners.apiKey.noLogin'

// "Key made 03/12/2026, 14:05": the co-op's time (Athens), never the browser's zone (adminweb AGENTS.md),
// through the shared format helpers so it reads like every other date in the admin.
export function formatKeyMade(date: Date, t: TFunction, f: Formats): string {
  return t('partners.apiKey.keyMade', { date: f.dateTime(date) })
}

// The card's first sentence: no login, the key's date, why there is no key (row 162), or no key.
export function keyStateText(partner: PartnerAdminDto, t: TFunction, f: Formats): string {
  if (!partner.userId) return t(NO_LOGIN_NO_KEY)
  if (partner.apiKeyCreatedAt != null) return formatKeyMade(partner.apiKeyCreatedAt, t, f)
  // Only with no key: the server clears the note whenever an admin makes, replaces or removes one.
  if (partner.apiKeyRemovedByResetAt) {
    return t('partners.apiKey.removedByReset', { date: f.dateTime(partner.apiKeyRemovedByResetAt) })
  }
  return t('partners.apiKey.none')
}

// Which step the dialog shows. Kept apart from `open`, so the title does not change while Radix
// animates the dialog closed (adminweb AGENTS.md).
type DialogMode = 'confirm-new' | 'confirm-remove' | 'shown'

// Spec 0037 (AC-5, AC-13): whether the restaurant has an API key and since when, and an admin's New
// API key and Remove key. A new key is shown once; the server keeps only its hash.
export function PartnerApiKeyCard({ partner }: { partner: PartnerAdminDto }) {
  const { toast } = useToast()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, or our own sentence when it gave none.
  const { errorText } = useServerText()
  // Dates in the reader's language, on Athens time.
  const f = useFormat()
  const [open, setOpenState] = useState(false)
  const [mode, setMode] = useState<DialogMode>('confirm-new')
  const [shownKey, setShownKey] = useState<string | null>(null)
  // Words, not a key: the error shows only inside the modal dialog, where the language switch cannot be reached.
  const [error, setError] = useState('')
  const reasonId = useId()
  // Whether the dialog is open right now. A request that ends after a click may read this, while its
  // own copy of `open` is the value from when it started (Fable review, minor 5).
  const openRef = useRef(false)
  // The button that opened the dialog gets focus back when it closes (Radix does not do it here).
  const newButtonRef = useRef<HTMLButtonElement>(null)
  const removeButtonRef = useRef<HTMLButtonElement>(null)
  const openedBy = useRef<React.RefObject<HTMLButtonElement> | null>(null)
  const [createApiKey, createState] = useCreatePartnerApiKeyMutation()
  const [removeApiKey, removeState] = useRemovePartnerApiKeyMutation()

  const noLogin = !partner.userId
  // `!= null` (loose) is false for null and undefined alike, so the buttons agree with the sentence above
  // even for a partner object whose field is missing (Fable review of row 162, minor).
  const hasKey = partner.apiKeyCreatedAt != null
  const busy = createState.isLoading || removeState.isLoading
  // The step that shows the key; only Done closes it (AC-13).
  const shown = mode === 'shown' && shownKey !== null

  const setOpen = (next: boolean) => {
    openRef.current = next
    setOpenState(next)
  }

  const openDialog = (nextMode: DialogMode, by: React.RefObject<HTMLButtonElement>) => {
    openedBy.current = by
    setMode(nextMode)
    setError('')
    setOpen(true)
  }

  const makeKey = async () => {
    setError('')
    // The request object, kept so its answer can be dropped from the Redux store right after it is
    // read: the key must live only in this panel (AC-13). The hook's own `reset` cannot do it here, as
    // it still holds the render from before this request (Fable review, major).
    const request = createApiKey({ id: partner.id })
    try {
      const answer = await request.unwrap()
      setShownKey(answer.apiKey)
      setMode('shown')
      setOpen(true)
    } catch (err: any) {
      const message = errorText(err, t('partners.apiKey.makeFailed'))
      if (openRef.current) {
        setError(message)
      } else {
        toast({ title: message, variant: 'destructive' })
      }
    } finally {
      request.reset()
    }
  }

  const onNewKey = () => {
    // A restaurant with a key is asked first, since the current key stops working at once.
    if (hasKey) {
      openDialog('confirm-new', newButtonRef)
    } else {
      openedBy.current = newButtonRef
      void makeKey()
    }
  }

  const onRemoveConfirmed = async () => {
    setError('')
    try {
      await removeApiKey({ id: partner.id }).unwrap()
      toast({ title: t('partners.apiKey.removed', { name: partner.name }) })
      // Remove key is about to be disabled (no key any more), so focus goes to New API key.
      openedBy.current = newButtonRef
      setOpen(false)
    } catch (err: any) {
      const message = errorText(err, t('partners.apiKey.removeFailed'))
      if (openRef.current) {
        setError(message)
      } else {
        toast({ title: message, variant: 'destructive' })
      }
    }
  }

  // Three explicit steps, so the key panel never shows under another step's title.
  let title: string
  let description: string
  if (mode === 'shown') {
    title = t('partners.apiKey.shownTitle')
    description = t('partners.apiKey.shownDescription', { name: partner.name })
  } else if (mode === 'confirm-new') {
    title = t('partners.apiKey.replaceTitle')
    description = t('partners.apiKey.replaceDescription', { name: partner.name })
  } else {
    title = t('partners.apiKey.removeTitle')
    description = t('partners.apiKey.removeDescription', { name: partner.name })
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('partners.apiKey.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p id={reasonId} data-testid="api-key-state">
          {keyStateText(partner, t, f)}
        </p>
        <p className="text-muted-foreground">{t('partners.apiKey.explainer')}</p>
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
            {t('partners.apiKey.newKey')}
          </Button>
          <Button
            ref={removeButtonRef}
            type="button"
            variant="outline"
            disabled={noLogin || !hasKey || busy}
            // Off with no login or no key: the sentence above says which.
            aria-describedby={noLogin || !hasKey ? reasonId : undefined}
            onClick={() => openDialog('confirm-remove', removeButtonRef)}
          >
            {t('partners.apiKey.removeKey')}
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          // While the key shows, nothing but Done closes the dialog (AC-13).
          if (!next && shown) return
          setOpen(next)
        }}
      >
        <DialogContent
          className="sm:max-w-lg"
          // No corner X on the key step, and Escape and a click outside do nothing there. The two
          // confirmations close as usual.
          hideCloseButton={shown}
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
          {error ? (
            <div role="alert" className="text-sm text-destructive font-medium">
              {error}
            </div>
          ) : null}
          {mode === 'shown' ? (
            shownKey !== null ? (
              <ApiKeyShownOnce apiKey={shownKey} onDone={() => setOpen(false)} />
            ) : null
          ) : (
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              {mode === 'confirm-new' ? (
                <Button type="button" disabled={busy} onClick={() => void makeKey()}>
                  {createState.isLoading ? <Spinner className="mr-2" /> : null}
                  {t('partners.apiKey.makeNew')}
                </Button>
              ) : (
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void onRemoveConfirmed()}>
                  {removeState.isLoading ? <Spinner className="mr-2" /> : null}
                  {t('partners.apiKey.removeKey')}
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
