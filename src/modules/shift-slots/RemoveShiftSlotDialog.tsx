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
  Spinner,
} from '@/admin-web-components'
import type { ShiftSlotAdminDto } from '@/backend-admin-sdk'
import { isShiftSlotConflict, refreshShiftSlots, useRemoveShiftSlotMutation } from '@/api/shiftSlotApi'
import { useAppDispatch } from '@/ui-shared-utils'
import { useFormat } from '@/i18n/useFormat'
import { useServerText } from '@/i18n/useServerText'
import { describeSlot } from './shiftSlotDisplay'

// Asks first, naming the slot (spec 0026, AC-6). The slot leaves the list; it and its record stay.
export function RemoveShiftSlotDialog({
  slot,
  onClose,
  onCloseAutoFocus,
}: {
  slot: ShiftSlotAdminDto
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
}) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const { language } = useFormat()
  const { errorText } = useServerText()
  const [removeSlot, { isLoading }] = useRemoveShiftSlotMutation()
  const dispatch = useAppDispatch()
  // What the server threw, kept as it came: its words are worked out when drawn, in the current language.
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)

  const confirm = async () => {
    setFailure(null)
    try {
      await removeSlot({ id: slot.id }).unwrap()
      onClose()
    } catch (err) {
      if (isShiftSlotConflict(err)) dispatch(refreshShiftSlots())
      setFailure({ error: err })
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('shiftSlots.remove.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('shiftSlots.remove.description', { slot: describeSlot(slot, t, language) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failure ? (
          <p role="alert" className="text-sm text-destructive">
            {errorText(failure.error, t('shiftSlots.remove.failed'))}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          {/* A plain Button, so the dialog stays open until the removal is done. */}
          <Button variant="destructive" onClick={confirm} disabled={isLoading}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t('common.remove')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
