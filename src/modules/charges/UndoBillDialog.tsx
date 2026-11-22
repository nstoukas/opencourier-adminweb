import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useServerText } from '@/i18n/useServerText'
import { useAppDispatch } from '@/ui-shared-utils'
import { billLabel } from './chargeWording'

export const UNDO_REASON_MAX = 300

// Spec 0036, AC-7. Undoing a bill needs a reason. Its lines become unbilled again; the bill stays on
// the record as undone, with who, when and why.
export function UndoBillDialog({
  bill,
  onClose,
  onSaved,
  onCloseAutoFocus,
}: {
  bill: PartnerBillDto
  onClose: () => void
  // Called once the undo is saved, before the dialog closes.
  onSaved?: () => void
  onCloseAutoFocus: (event: Event) => void
}) {
  const [undoBill, { isLoading }] = useUndoPartnerBillMutation()
  const dispatch = useAppDispatch()
  const [reason, setReason] = useState('')
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, else the fallback given.
  const { errorText } = useServerText()
  // The failed request's error itself, not words, so the message is written in the language shown now.
  const [error, setError] = useState<unknown>(null)
  const trimmed = reason.trim()
  const valid = trimmed.length >= 1 && trimmed.length <= UNDO_REASON_MAX

  const confirm = async () => {
    setError(null)
    try {
      await undoBill({ billId: bill.id, reason: trimmed }).unwrap()
      onSaved?.()
      onClose()
    } catch (err) {
      // Already undone by someone else: show the bill as it is now.
      if ((err as { statusCode?: number } | undefined)?.statusCode === 409) dispatch(refreshPartnerCharges())
      // `?? {}`: a throw of nothing still shows the fallback.
      setError(err ?? {})
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('charges.undoBill.title', { bill: billLabel(t, bill) })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('charges.undoBill.description', { count: bill.lineCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="undo-reason">{t('charges.undoBill.why')}</FieldLabel>
          <Textarea
            id="undo-reason"
            value={reason}
            maxLength={UNDO_REASON_MAX + 50}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={trimmed.length > UNDO_REASON_MAX}
          />
          <FieldDescription>
            {trimmed.length > UNDO_REASON_MAX
              ? t('charges.atMostCharacters', { max: UNDO_REASON_MAX })
              : t('charges.undoBill.hint')}
          </FieldDescription>
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {errorText(error, t('charges.undoBill.failed'))}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          {/* A plain Button, so the dialog stays open until the undo is done. */}
          <Button variant="destructive" onClick={confirm} disabled={isLoading || !valid}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t('charges.undoBill.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
