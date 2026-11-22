import React from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/admin-web-components'
import type { ShiftSlotAdminDto, ShiftSlotChangeAdminDto } from '@/backend-admin-sdk'
import { useGetShiftSlotChangesQuery } from '@/api/shiftSlotApi'
import { useFormat } from '@/i18n/useFormat'
import type { Language } from '@/i18n/language'
import { describeSlot } from './shiftSlotDisplay'

// What a change did, in words: the new slot, the old one, or both.
function changeText(change: ShiftSlotChangeAdminDto, t: TFunction, language: Language): string {
  const describe = (slot: Parameters<typeof describeSlot>[0]) => describeSlot(slot, t, language)
  if (change.action === 'CREATED' && change.after) return describe(change.after)
  if (change.action === 'REMOVED' && change.before) return describe(change.before)
  if (change.before && change.after) return `${describe(change.before)} → ${describe(change.after)}`
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
  // useTranslation gives t, which looks a key up in the reader's language; useFormat formats the times.
  const { t } = useTranslation()
  const f = useFormat()
  const { data, isLoading, isError } = useGetShiftSlotChangesQuery({ id: slot.id })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{t('shiftSlots.history.title')}</DialogTitle>
          <DialogDescription>{describeSlot(slot, t, f.language)}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('shiftSlots.history.loadFailed')}</p>
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('shiftSlots.history.none')}</p>
        ) : (
          <ol className="flex flex-col gap-3 text-sm">
            {(data ?? []).map((change) => (
              <li key={change.id} className="border-b border-border pb-2 last:border-b-0">
                <p className="font-medium">
                  {/* A new action from the server shows as its code. */}
                  {`${t(`shiftSlots.history.${change.action}`, { defaultValue: change.action })} · ${f.weekdayDate(
                    change.createdAt,
                  )}, ${f.time(change.createdAt)} · ${t('shiftSlots.history.by')} `}
                  <span className="font-mono" title={change.changedByUserId}>
                    {change.changedByUserId.slice(-6)}
                  </span>
                </p>
                <p className="text-muted-foreground">{changeText(change, t, f.language)}</p>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  )
}
