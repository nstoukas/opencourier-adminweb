import React, { useRef, useState } from 'react'
import { CalendarPlus, ClockCounterClockwise, PencilSimple, Trash } from '@phosphor-icons/react'
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle, Switch } from '@/admin-web-components'
import type { ShiftSlotAdminDto } from '@/backend-admin-sdk'
import { useGetInstanceConfigQuery } from '@/api/configApi'
import { useGetShiftSlotsQuery } from '@/api/shiftSlotApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { RemoveShiftSlotDialog } from './RemoveShiftSlotDialog'
import { ShiftSlotDialog } from './ShiftSlotDialog'
import { ShiftSlotHistoryDialog } from './ShiftSlotHistoryDialog'
import { WEEKDAYS, minutesToClock } from './shiftSlotDisplay'

// Which dialog over a slot is open, besides Add and Edit.
type SlotDialog = { kind: 'remove' | 'history'; slot: ShiftSlotAdminDto } | null

// The co-op's weekly shift slots (spec 0026, row 77): grouped by day, each with its times and cap, and
// Add, Edit, Remove and History. Nothing here reaches riders until shift booking (row 78).
export function ShiftSlotsPage() {
  const [showRemoved, setShowRemoved] = useState(false)
  const slotsQuery = useGetShiftSlotsQuery({ includeRemoved: showRemoved })
  const configQuery = useGetInstanceConfigQuery({})
  // The Add and Edit dialog: open and the slot being edited are separate state, so the title does not
  // change while the dialog animates closed (adminweb AGENTS.md).
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ShiftSlotAdminDto | null>(null)
  const [slotDialog, setSlotDialog] = useState<SlotDialog>(null)
  // The button that opened a dialog, which gets focus back when it closes.
  const addRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const editorReturn = useRef<HTMLElement | null>(null)

  const returnFocus = (event: Event) => {
    if (openerRef.current) {
      event.preventDefault()
      openerRef.current.focus()
    }
  }

  const slots = slotsQuery.data ?? []
  const shiftsOff = configQuery.data !== undefined && configQuery.data.shiftsEnabled !== true

  return (
    <>
      <PageHeader
        title="Shift slots"
        description="Weekly slots in Athens time, with the most riders each takes. Every change is on the record."
        action={
          <Button
            ref={addRef}
            type="button"
            onClick={() => {
              editorReturn.current = addRef.current
              setEditing(null)
              setEditorOpen(true)
            }}
          >
            <CalendarPlus aria-hidden="true" className="mr-2 h-4 w-4" />
            Add slot
          </Button>
        }
      />

      {shiftsOff ? (
        <Alert className="mb-6">
          <AlertDescription>
            Shifts are off. Riders see none of this until you switch them on in Settings.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-4 flex items-center gap-3">
        <Switch id="show-removed-slots" checked={showRemoved} onCheckedChange={(checked: boolean) => setShowRemoved(checked)} />
        <label htmlFor="show-removed-slots" className="text-sm">
          Show removed slots
        </label>
      </div>

      {slotsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : slotsQuery.isError ? (
        <p className="text-sm text-destructive">Could not load the shift slots.</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shift slots yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {WEEKDAYS.filter((day) => slots.some((slot) => slot.weekday === day.value)).map((day) => (
            <Card key={day.value}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{day.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul>
                  {slots
                    .filter((slot) => slot.weekday === day.value)
                    .map((slot) => {
                      const removed = slot.removedAt !== null
                      return (
                        <li
                          key={slot.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-b-0"
                        >
                          <span className={`text-sm ${removed ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                            <span className="tabular-nums">
                              {minutesToClock(slot.startMinute)} to {minutesToClock(slot.endMinute)}
                            </span>
                            {' · '}
                            {slot.riderCap === 1 ? '1 rider' : `${slot.riderCap} riders`}
                            {removed ? ' · removed' : ''}
                          </span>
                          <span className="flex gap-2">
                            {removed ? null : (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  aria-label={`Edit ${day.label} ${minutesToClock(slot.startMinute)}`}
                                  onClick={(event) => {
                                    editorReturn.current = event.currentTarget
                                    setEditing(slot)
                                    setEditorOpen(true)
                                  }}
                                >
                                  <PencilSimple aria-hidden="true" className="mr-1.5 h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  aria-label={`Remove ${day.label} ${minutesToClock(slot.startMinute)}`}
                                  onClick={(event) => {
                                    openerRef.current = event.currentTarget
                                    setSlotDialog({ kind: 'remove', slot })
                                  }}
                                >
                                  <Trash aria-hidden="true" className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`History of ${day.label} ${minutesToClock(slot.startMinute)}`}
                              onClick={(event) => {
                                openerRef.current = event.currentTarget
                                setSlotDialog({ kind: 'history', slot })
                              }}
                            >
                              <ClockCounterClockwise aria-hidden="true" className="mr-1.5 h-4 w-4" />
                              History
                            </Button>
                          </span>
                        </li>
                      )
                    })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ShiftSlotDialog
        open={editorOpen}
        slot={editing}
        onOpenChange={setEditorOpen}
        returnFocusTo={editorReturn as React.RefObject<HTMLElement>}
      />
      {slotDialog?.kind === 'remove' ? (
        <RemoveShiftSlotDialog slot={slotDialog.slot} onClose={() => setSlotDialog(null)} onCloseAutoFocus={returnFocus} />
      ) : null}
      {slotDialog?.kind === 'history' ? (
        <ShiftSlotHistoryDialog slot={slotDialog.slot} onClose={() => setSlotDialog(null)} onCloseAutoFocus={returnFocus} />
      ) : null}
    </>
  )
}
