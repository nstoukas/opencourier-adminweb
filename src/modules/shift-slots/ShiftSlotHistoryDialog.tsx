import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/admin-web-components'
import type { ShiftSlotAdminDto, ShiftSlotChangeAdminDto } from '@/backend-admin-sdk'
import { useGetShiftSlotChangesQuery } from '@/api/shiftSlotApi'
import { athensDateTime } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { describeSlot } from './shiftSlotDisplay'

const ACTION_WORDS: Record<ShiftSlotChangeAdminDto['action'], string> = {
  CREATED: 'Added',
  UPDATED: 'Changed',
  REMOVED: 'Removed',
}

// What a change did, in words: the new slot, the old one, or both.
function changeText(change: ShiftSlotChangeAdminDto): string {
  if (change.action === 'CREATED' && change.after) return describeSlot(change.after)
  if (change.action === 'REMOVED' && change.before) return describeSlot(change.before)
  if (change.before && change.after) return `${describeSlot(change.before)} → ${describeSlot(change.after)}`
  return ''
}

// A slot's record, newest first (spec 0026, AC-3): what changed, when, and which admin. The admin shows
// as the end of their id, the full id in the tooltip, as dispatch stops do.
export function ShiftSlotHistoryDialog({
  slot,
  onClose,
  onCloseAutoFocus,
}: {
  slot: ShiftSlotAdminDto
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
}) {
  const { data, isLoading, isError } = useGetShiftSlotChangesQuery({ id: slot.id })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>Slot history</DialogTitle>
          <DialogDescription>{describeSlot(slot)}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Could not load the history.</p>
        ) : (
          <ol className="flex flex-col gap-3 text-sm">
            {(data ?? []).map((change) => (
              <li key={change.id} className="border-b border-border pb-2 last:border-b-0">
                <p className="font-medium">
                  {ACTION_WORDS[change.action]} · {athensDateTime(change.createdAt)} · by{' '}
                  <span className="font-mono" title={change.changedByUserId}>
                    {change.changedByUserId.slice(-6)}
                  </span>
                </p>
                <p className="text-muted-foreground">{changeText(change)}</p>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  )
}
