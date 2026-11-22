import { useRef, useState } from 'react'
// useTranslation gives t, which looks a key up in the reader's language.
import { useTranslation } from 'react-i18next'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Textarea,
  useToast,
} from '@/admin-web-components'
import type { DispatchAttentionRowDto } from '@/backend-admin-sdk'
import { useApproveRemovalRequestMutation, useDeclineRemovalRequestMutation } from '@/api/removalRequestApi'
import { useServerText } from '@/i18n/useServerText'

// The same limit as the backend's `decisionNote` column.
const DECLINE_NOTE_MAX = 500

// True for the backend's 409: someone else answered first, or the order moved on.
function isConflict(err: unknown): boolean {
  return (err as { statusCode?: number } | undefined)?.statusCode === 409
}

// The two answers a removal request row offers (spec 0035, AC-6). One click approves, sending the
// `pickedUp` this row was drawn with, so a stale board can never cancel an order by surprise (AC-8).
export function ApproveRemovalButton({ row }: { row: DispatchAttentionRowDto }) {
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, else the fallback given.
  const { errorText } = useServerText()
  const { toast } = useToast()
  const [approve, { isLoading }] = useApproveRemovalRequestMutation()
  // Stays true until the board's refresh removes this row, so the button cannot be pressed again.
  const [saved, setSaved] = useState(false)

  const onClick = async () => {
    if (!row.removalRequestId) return
    try {
      const result = await approve({ id: row.removalRequestId, pickedUp: row.pickedUp === true }).unwrap()
      setSaved(true)
      toast({
        title: t('dispatch.removal.approved'),
        description:
          result.deliveryStatus === 'CANCELED'
            ? t('dispatch.removal.approvedCanceled')
            : t('dispatch.removal.approvedOff'),
      })
    } catch (err) {
      // A toast, because the board's refresh takes this row (and anything inside it) away.
      toast({
        title: t('dispatch.removal.notApproved'),
        description: errorText(err, t('dispatch.removal.approveFailed')),
        variant: 'destructive',
      })
    }
  }

  return (
    // Red when approving cancels the order, so that row's button does not look like the others.
    <Button
      type="button"
      size="sm"
      variant={row.pickedUp ? 'destructive' : 'default'}
      disabled={isLoading || saved}
      onClick={onClick}
    >
      {t('dispatch.removal.approve')}
    </Button>
  )
}

// Declining can carry one sentence, which the rider reads on the job (AC-7).
export function DeclineRemovalButton({ row }: { row: DispatchAttentionRowDto }) {
  const { t } = useTranslation()
  const { errorText } = useServerText()
  const { toast } = useToast()
  const [decline, { isLoading }] = useDeclineRemovalRequestMutation()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  // The refusal itself, not its words: they are made when it draws, so a language switch reaches it.
  const [error, setError] = useState<{ err: unknown } | null>(null)
  // Stays true until the board's refresh removes this row, as on Approve.
  const [saved, setSaved] = useState(false)
  // The opening button: focus goes back to it when the dialog closes (adminweb AGENTS.md gotcha).
  const triggerRef = useRef<HTMLButtonElement>(null)

  const handleOpenChange = (next: boolean) => {
    if (isLoading) return
    if (next) {
      setNote('')
      setError(null)
    }
    setOpen(next)
  }

  const submit = async () => {
    if (!row.removalRequestId) return
    setError(null)
    try {
      const sentence = note.trim()
      await decline({ id: row.removalRequestId, note: sentence === '' ? undefined : sentence }).unwrap()
      setSaved(true)
      setOpen(false)
    } catch (err) {
      if (isConflict(err)) {
        // This row is about to leave the board with the dialog inside it, so say it in a toast.
        setOpen(false)
        toast({
          title: t('dispatch.removal.notDeclined'),
          description: errorText(err, t('dispatch.removal.declineFailed')),
          variant: 'destructive',
        })
      } else {
        setError({ err })
      }
    }
  }

  return (
    <>
      <Button ref={triggerRef} type="button" size="sm" variant="outline" disabled={saved} onClick={() => handleOpenChange(true)}>
        {t('dispatch.removal.decline')}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            triggerRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('dispatch.removal.declineTitle')}</DialogTitle>
            <DialogDescription>
              {t('dispatch.removal.declineDescription', { name: row.riderName ?? t('dispatch.removal.theRider') })}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`decline-note-${row.id}`}>{t('dispatch.removal.noteLabel')}</FieldLabel>
            <Textarea
              id={`decline-note-${row.id}`}
              rows={3}
              value={note}
              maxLength={DECLINE_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
            />
            <FieldDescription>{t('dispatch.removal.noteHint', { max: DECLINE_NOTE_MAX })}</FieldDescription>
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {errorText(error.err, t('dispatch.removal.declineFailed'))}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isLoading} onClick={() => handleOpenChange(false)}>
              {t('dispatch.removal.keepOpen')}
            </Button>
            <Button type="button" disabled={isLoading} onClick={submit}>
              {isLoading ? t('dispatch.removal.declining') : t('dispatch.removal.decline')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
