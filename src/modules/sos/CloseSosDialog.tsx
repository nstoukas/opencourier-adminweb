import React, { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Spinner,
  Textarea,
  useToast,
} from '@/admin-web-components'
import { useCloseSosMutation } from '@/api/sosApi'
import type { SosOutcome } from '@/backend-admin-sdk'
import { backendMessage } from '@/modules/couriers/courierAccountRules'
import { SOS_NOTE_MAX, SOS_OUTCOMES, SOS_OUTCOME_LABELS } from './sosDisplay'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  incidentId: string
  riderName: string
  // Still active: closing it also stops the rider's phone sharing its position.
  active: boolean
  // How the rider ended it, if they did ("I'm safe" or "False alarm"): the outcome starts there.
  // Otherwise the admin must choose one (row 73 review: no outcome is recorded that nobody chose).
  riderOutcome: SosOutcome | null
  // The button that opened the dialog; focus goes back to it on close (adminweb AGENTS.md).
  returnFocusTo: React.RefObject<HTMLElement>
}

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Spec 0022 (AC-10): an admin closes an SOS with what happened and an optional note. The close
// records who and when; if the SOS was still active, the rider's phone stops sharing and the rider
// can be offered work again.
export function CloseSosDialog({
  open,
  onOpenChange,
  incidentId,
  riderName,
  active,
  riderOutcome,
  returnFocusTo,
}: Props) {
  const { toast } = useToast()
  const [closeSos, { isLoading }] = useCloseSosMutation()
  // '' while nothing is chosen yet: Close SOS stays disabled until it is.
  const [outcome, setOutcome] = useState<SosOutcome | ''>(riderOutcome ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setOutcome(riderOutcome ?? '')
      setNote('')
      setError(null)
    }
  }, [open, riderOutcome])

  const tooLong = note.length > SOS_NOTE_MAX

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isLoading || tooLong || outcome === '') return
    setError(null)
    try {
      await closeSos({ id: incidentId, outcome, note: note.trim() === '' ? null : note.trim() }).unwrap()
      toast({ title: 'The SOS is closed.' })
      onOpenChange(false)
    } catch (err: unknown) {
      // The backend names what is wrong ("This SOS has already been closed.").
      setError(backendMessage(err, 'The SOS could not be closed. Please try again.'))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isLoading) return
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Close {riderName}&apos;s SOS</DialogTitle>
            <DialogDescription>
              {active
                ? "Closing it stops the rider's phone sharing its position, and they can be offered work again."
                : 'The rider already ended it. Closing it records what happened.'}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label htmlFor="sos-outcome">What happened</Label>
              <select
                id="sos-outcome"
                className={SELECT_CLASS}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as SosOutcome | '')}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {SOS_OUTCOMES.map((value) => (
                  <option key={value} value={value}>
                    {SOS_OUTCOME_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sos-note">Note (optional)</Label>
              <Textarea
                id="sos-note"
                value={note}
                rows={4}
                aria-describedby="sos-note-count"
                aria-invalid={tooLong}
                onChange={(e) => setNote(e.target.value)}
              />
              <p id="sos-note-count" className={tooLong ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                {note.length} / {SOS_NOTE_MAX}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || tooLong || outcome === ''}>
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Close SOS
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
