import React, { useEffect, useState } from 'react'
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
import { useCreateShiftSlotMutation, useUpdateShiftSlotMutation } from '@/api/shiftSlotApi'
import { backendMessage } from '@/modules/couriers/courierAccountRules'
import { WEEKDAYS, clockToMinutes, minutesToClock } from './shiftSlotDisplay'

type Props = {
  open: boolean
  // Add when null, Edit when a slot. Kept apart from `open` by the page, so the title does not change
  // while the dialog animates closed (adminweb AGENTS.md).
  slot: ShiftSlotAdminDto | null
  onOpenChange: (open: boolean) => void
  // Radix does not give focus back here: the page passes the button that opened the dialog.
  returnFocusTo: React.RefObject<HTMLElement>
}

// Add a slot or edit one (spec 0026, AC-6): the day, the start and end on the 24 hour clock, the cap.
export function ShiftSlotDialog({ open, slot, onOpenChange, returnFocusTo }: Props) {
  const [createSlot, { isLoading: creating }] = useCreateShiftSlotMutation()
  const [updateSlot, { isLoading: updating }] = useUpdateShiftSlotMutation()
  const [weekday, setWeekday] = useState('5')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [cap, setCap] = useState('')
  const [error, setError] = useState<string | null>(null)
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
    if (startMinute === null) return setError('Type the start as HH:mm on the 24 hour clock, for example 19:00.')
    if (endMinute === null) return setError('Type the end as HH:mm on the 24 hour clock, for example 23:00, or 24:00 for midnight.')
    if (endMinute <= startMinute) return setError('The end must be after the start, on the same day. Two slots can cover a late night.')
    if (cap.trim() === '' || !Number.isInteger(riderCap) || riderCap < 1 || riderCap > 50) {
      return setError('The rider cap must be a whole number from 1 to 50.')
    }
    const fields: ShiftSlotFieldsAdmin = { weekday: Number(weekday), startMinute, endMinute, riderCap }
    setError(null)
    try {
      if (slot) await updateSlot({ id: slot.id, input: fields }).unwrap()
      else await createSlot(fields).unwrap()
      onOpenChange(false)
    } catch (err) {
      setError(backendMessage(err, 'The slot could not be saved. Try again in a moment.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (returnFocusTo.current) {
            event.preventDefault()
            returnFocusTo.current.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{slot ? 'Edit slot' : 'Add slot'}</DialogTitle>
          <DialogDescription>A weekly slot in Athens time, with the most riders it takes.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="shift-slot-day">Day</FieldLabel>
            <NativeSelect id="shift-slot-day" value={weekday} onChange={(event) => setWeekday(event.target.value)}>
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={String(day.value)}>
                  {day.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="shift-slot-start">Start</FieldLabel>
              <Input id="shift-slot-start" inputMode="numeric" placeholder="19:00" value={start} onChange={(event) => setStart(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="shift-slot-end">End</FieldLabel>
              <Input id="shift-slot-end" inputMode="numeric" placeholder="23:00" value={end} onChange={(event) => setEnd(event.target.value)} />
            </Field>
          </div>
          <FieldDescription>24 hour clock. A slot ends on the day it starts; 24:00 ends it at midnight.</FieldDescription>
          <Field>
            <FieldLabel htmlFor="shift-slot-cap">Rider cap</FieldLabel>
            <Input id="shift-slot-cap" inputMode="numeric" placeholder="6" value={cap} onChange={(event) => setCap(event.target.value)} />
            <FieldDescription>The most riders the slot takes, 1 to 50.</FieldDescription>
          </Field>
        </FieldGroup>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {slot ? 'Save slot' : 'Add slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
