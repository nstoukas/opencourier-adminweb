import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Spinner,
  Textarea,
} from '@/admin-web-components'
import type { PartnerBillDto } from '@/backend-admin-sdk'
import { refreshPartnerCharges, useUndoPartnerBillMutation } from '@/api/partnerChargeApi'
import { backendMessage } from '@/modules/couriers/courierAccountRules'
import { useAppDispatch } from '@/ui-shared-utils'
import { billLabel } from './chargeWording'

export const UNDO_REASON_MAX = 300

// Spec 0036, AC-7. Undoing a bill needs a reason. Its lines become unbilled again; the bill stays on
// the record as undone, with who, when and why.
export function UndoBillDialog({
  bill,
  onClose,
  onCloseAutoFocus,
}: {
  bill: PartnerBillDto
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
}) {
  const [undoBill, { isLoading }] = useUndoPartnerBillMutation()
  const dispatch = useAppDispatch()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const trimmed = reason.trim()
  const valid = trimmed.length >= 1 && trimmed.length <= UNDO_REASON_MAX

  const confirm = async () => {
    setError(null)
    try {
      await undoBill({ billId: bill.id, reason: trimmed }).unwrap()
      onClose()
    } catch (err) {
      // Already undone by someone else: show the bill as it is now.
      if ((err as { statusCode?: number } | undefined)?.statusCode === 409) dispatch(refreshPartnerCharges())
      setError(backendMessage(err, 'The bill could not be undone. Try again in a moment.'))
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Undo {billLabel(bill)}?</AlertDialogTitle>
          <AlertDialogDescription>
            Its {bill.lineCount === 1 ? 'line becomes' : `${bill.lineCount} lines become`} unbilled again. The bill stays on
            the record as undone, with your reason.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="undo-reason">Why</FieldLabel>
          <Textarea
            id="undo-reason"
            value={reason}
            maxLength={UNDO_REASON_MAX + 50}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={trimmed.length > UNDO_REASON_MAX}
          />
          <FieldDescription>
            {trimmed.length > UNDO_REASON_MAX ? `At most ${UNDO_REASON_MAX} characters.` : 'For example: wrong lines, or the invoice was cancelled.'}
          </FieldDescription>
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          {/* A plain Button, so the dialog stays open until the undo is done. */}
          <Button variant="destructive" onClick={confirm} disabled={isLoading || !valid}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Undo bill
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
