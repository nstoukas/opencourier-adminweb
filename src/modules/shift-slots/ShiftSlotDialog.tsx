import React, { useEffect, useState } from 'react'
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
  FieldGroup,
  FieldLabel,
  Input,
  NativeSelect,
  Spinner,
} from '@/admin-web-components'
import type { ShiftSlotAdminDto, ShiftSlotFieldsAdmin } from '@/backend-admin-sdk'
import { isShiftSlotConflict, refreshShiftSlots, useCreateShiftSlotMutation, useUpdateShiftSlotMutation } from '@/api/shiftSlotApi'
import { useAppDispatch } from '@/ui-shared-utils'
import { useFormat } from '@/i18n/useFormat'
import { useServerText } from '@/i18n/useServerText'
import { WEEKDAYS, clockToMinutes, minutesToClock, weekdayLabel } from './shiftSlotDisplay'

// What is wrong, kept until shown: a translation key for a check made here, or what the server threw.
// Either way the words are worked out when drawn, so they follow the reader's language.
type Problem = { key: string } | { error: unknown }

type Props = {
  open: boolean
  // Add when null, Edit when a slot. Kept apart from `open` by the page, so the title does not change
  // while the dialog animates closed (adminweb AGENTS.md).
  slot: ShiftSlotAdminDto | null
  onOpenChange: (open: boolean) => void
  // Radix does not give focus back here: the page passes the button that opened the dialog, and a
  // fallback for when that button has left the page (an Edit that moved the slot to another day).
  returnFocusTo: React.RefObject<HTMLElement>
  fallbackFocus?: React.RefObject<HTMLElement>
}

// Add a slot or edit one (spec 0026, AC-6): the day, the start and end on the 24 hour clock, the cap.
export function ShiftSlotDialog({ open, slot, onOpenChange, returnFocusTo, fallbackFocus }: Props) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const { language } = useFormat()
  const { errorText } = useServerText()
  const dispatch = useAppDispatch()
  const [createSlot, { isLoading: creating }] = useCreateShiftSlotMutation()
  const [updateSlot, { isLoading: updating }] = useUpdateShiftSlotMutation()
  const [weekday, setWeekday] = useState('5')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [cap, setCap] = useState('')
  const [error, setError] = useState<Problem | null>(null)
  const saving = creating || updating

  // Each open starts from the slot being edited, or empty for a new one.
  useEffect(() => {
    if (!open) return
    setWeekday(String(slot?.weekday ?? 5))
    setStart(slot ? minutesToClock(slot.startMinute) : '')
    setEnd(slot ? minutesToClock(slot.endMinute) : '')
    setCap(slot ? String(slot.riderCap) : '')
    setError(null)
  }, [open, slot])

  const save = async () => {
    const startMinute = clockToMinutes(start, false)
    const endMinute = clockToMinutes(end, true)
    const riderCap = Number(cap.trim())
    if (startMinute === null) return setError({ key: 'shiftSlots.dialog.startProblem' })
    if (endMinute === null) return setError({ key: 'shiftSlots.dialog.endProblem' })
    if (endMinute <= startMinute) return setError({ key: 'shiftSlots.dialog.orderProblem' })
    if (cap.trim() === '' || !Number.isInteger(riderCap) || riderCap < 1 || riderCap > 50) {
      return setError({ key: 'shiftSlots.dialog.capProblem' })
    }
    const fields: ShiftSlotFieldsAdmin = { weekday: Number(weekday), startMinute, endMinute, riderCap }
    setError(null)
    try {
      if (slot) await updateSlot({ id: slot.id, input: fields }).unwrap()
      else await createSlot(fields).unwrap()
      onOpenChange(false)
    } catch (err) {
      if (isShiftSlotConflict(err)) dispatch(refreshShiftSlots())
      setError({ error: err })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          const target = returnFocusTo.current?.isConnected ? returnFocusTo.current : fallbackFocus?.current
          if (target) {
            event.preventDefault()
            target.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{slot ? t('shiftSlots.dialog.editTitle') : t('shiftSlots.dialog.addTitle')}</DialogTitle>
          <DialogDescription>{t('shiftSlots.dialog.description')}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="shift-slot-day">{t('shiftSlots.dialog.day')}</FieldLabel>
            <NativeSelect id="shift-slot-day" value={weekday} onChange={(event) => setWeekday(event.target.value)}>
              {WEEKDAYS.map((day) => (
                <option key={day} value={String(day)}>
                  {weekdayLabel(day, t, language)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="shift-slot-start">{t('shiftSlots.dialog.start')}</FieldLabel>
              <Input id="shift-slot-start" inputMode="numeric" placeholder="19:00" value={start} onChange={(event) => setStart(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="shift-slot-end">{t('shiftSlots.dialog.end')}</FieldLabel>
              <Input id="shift-slot-end" inputMode="numeric" placeholder="23:00" value={end} onChange={(event) => setEnd(event.target.value)} />
            </Field>
          </div>
          <FieldDescription>{t('shiftSlots.dialog.clockHint')}</FieldDescription>
          <Field>
            <FieldLabel htmlFor="shift-slot-cap">{t('shiftSlots.dialog.cap')}</FieldLabel>
            <Input id="shift-slot-cap" inputMode="numeric" placeholder="6" value={cap} onChange={(event) => setCap(event.target.value)} />
            <FieldDescription>{t('shiftSlots.dialog.capHint')}</FieldDescription>
          </Field>
        </FieldGroup>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {'key' in error ? t(error.key) : errorText(error.error, t('shiftSlots.dialog.saveFailed'))}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {slot ? t('shiftSlots.dialog.save') : t('shiftSlots.dialog.addTitle')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
