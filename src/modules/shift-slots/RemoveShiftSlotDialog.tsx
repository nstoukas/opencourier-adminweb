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
  Spinner,
} from '@/admin-web-components'
import type { ShiftSlotAdminDto } from '@/backend-admin-sdk'
import { isShiftSlotConflict, refreshShiftSlots, useRemoveShiftSlotMutation } from '@/api/shiftSlotApi'
import { useAppDispatch } from '@/ui-shared-utils'
import { backendMessage } from '@/modules/couriers/courierAccountRules'
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
  const [removeSlot, { isLoading }] = useRemoveShiftSlotMutation()
  const dispatch = useAppDispatch()
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setError(null)
    try {
      await removeSlot({ id: slot.id }).unwrap()
      onClose()
    } catch (err) {
      if (isShiftSlotConflict(err)) dispatch(refreshShiftSlots())
      setError(backendMessage(err, 'The slot could not be removed. Try again in a moment.'))
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isLoading && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this slot?</AlertDialogTitle>
          <AlertDialogDescription>
            {describeSlot(slot)}. It leaves the list; its record stays, and you can still read it under Show removed slots.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          {/* A plain Button, so the dialog stays open until the removal is done. */}
          <Button variant="destructive" onClick={confirm} disabled={isLoading}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Remove
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
