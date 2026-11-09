import { useRef, useState } from 'react'
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
import { backendMessage } from '@/modules/couriers/courierAccountRules'

// The same limit as the backend's `decisionNote` column.
const DECLINE_NOTE_MAX = 500

// True for the backend's 409: someone else answered first, or the order moved on.
function isConflict(err: unknown): boolean {
  return (err as { statusCode?: number } | undefined)?.statusCode === 409
}

// The two answers a removal request row offers (spec 0035, AC-6). One click approves, sending the
// `pickedUp` this row was drawn with, so a stale board can never cancel an order by surprise (AC-8).
export function ApproveRemovalButton({ row }: { row: DispatchAttentionRowDto }) {
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
        title: 'Approved',
        description:
          result.deliveryStatus === 'CANCELED'
            ? 'The order is cancelled. The rider says whether the food went back.'
            : 'The rider is off the order. It is offered again once the food is due.',
      })
    } catch (err) {
      // A toast, because the board's refresh takes this row (and anything inside it) away.
      toast({
        title: 'Not approved',
        description: backendMessage(err, 'The request could not be approved. Try again in a moment.'),
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
      Approve
    </Button>
  )
}

// Declining can carry one sentence, which the rider reads on the job (AC-7).
export function DeclineRemovalButton({ row }: { row: DispatchAttentionRowDto }) {
  const { toast } = useToast()
  const [decline, { isLoading }] = useDeclineRemovalRequestMutation()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
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
      const message = backendMessage(err, 'The request could not be declined. Try again in a moment.')
      if (isConflict(err)) {
        // This row is about to leave the board with the dialog inside it, so say it in a toast.
        setOpen(false)
        toast({ title: 'Not declined', description: message, variant: 'destructive' })
      } else {
        setError(message)
      }
    }
  }

  return (
    <>
      <Button ref={triggerRef} type="button" size="sm" variant="outline" disabled={saved} onClick={() => handleOpenChange(true)}>
        Decline
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
            <DialogTitle>Decline this request</DialogTitle>
            <DialogDescription>{row.riderName ?? 'The rider'} stays on the order and can ask again.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`decline-note-${row.id}`}>A sentence for the rider (optional)</FieldLabel>
            <Textarea
              id={`decline-note-${row.id}`}
              rows={3}
              value={note}
              maxLength={DECLINE_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
            />
            <FieldDescription>The rider sees it on the job. At most {DECLINE_NOTE_MAX} characters.</FieldDescription>
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isLoading} onClick={() => handleOpenChange(false)}>
              Keep it open
            </Button>
            <Button type="button" disabled={isLoading} onClick={submit}>
              {isLoading ? 'Declining…' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
