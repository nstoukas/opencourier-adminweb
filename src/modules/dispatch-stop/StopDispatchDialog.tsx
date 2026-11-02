import React, { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  useToast,
} from '@/admin-web-components'
import { useCreateDispatchStopMutation, useGetDispatchStopPreviewQuery } from '@/api/dispatchStopApi'
import type { DispatchStopReason } from '@/backend-admin-sdk'
import { backendMessage } from '@/modules/couriers/courierAccountRules'
import { REASON_LABELS, athensToday } from './dispatchStopDisplay'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // 'now' stops dispatch at once; 'schedule' sets a stop for later hours (spec 0014, AC-1, AC-2).
  mode: 'now' | 'schedule'
  // The button that opened the dialog; focus goes back to it on close (adminweb AGENTS.md).
  returnFocusTo: React.RefObject<HTMLElement>
}

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Stop dispatch now (until a time, or until restarted) or schedule a stop, in Athens time.
export function StopDispatchDialog({ open, onOpenChange, mode, returnFocusTo }: Props) {
  const { toast } = useToast()
  const [createStop, { isLoading }] = useCreateDispatchStopMutation()
  // The counts are read each time Stop now opens (spec 0014, AC-9); skipped for a schedule.
  const preview = useGetDispatchStopPreviewQuery(undefined, {
    skip: !open || mode !== 'now',
    refetchOnMountOrArgChange: true,
  })
  const [reason, setReason] = useState<DispatchStopReason>('HEAT')
  const [hasEnd, setHasEnd] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const today = athensToday()
      setReason('HEAT')
      setHasEnd(mode === 'schedule')
      setStartDate(today)
      setStartTime('12:00')
      setEndDate(today)
      setEndTime(mode === 'schedule' ? '17:00' : '')
      setError(null)
    }
  }, [open, mode])

  const needsEnd = mode === 'schedule' || hasEnd
  const isValid = (mode === 'now' || (startDate && startTime)) && (!needsEnd || (endDate !== '' && endTime !== ''))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValid || isLoading) return
    setError(null)
    try {
      await createStop({
        reason,
        ...(mode === 'schedule' ? { startsOn: { date: startDate, time: startTime } } : {}),
        ...(needsEnd ? { endsOn: { date: endDate, time: endTime } } : {}),
      }).unwrap()
      toast({ title: mode === 'now' ? 'Dispatch is stopped.' : 'The stop is scheduled.' })
      onOpenChange(false)
    } catch (err: unknown) {
      // The backend names what is wrong ("Another dispatch stop already covers part of that time.").
      setError(backendMessage(err, 'The stop could not be saved. Please try again.'))
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
            <DialogTitle>{mode === 'now' ? 'Stop dispatch now' : 'Schedule a stop'}</DialogTitle>
            <DialogDescription>
              No rider gets an offer and no restaurant can order delivery while it is on. Deliveries already picked up
              are finished. Times are Athens time.
            </DialogDescription>
          </DialogHeader>

          {mode === 'now' ? (
            <p role="note" className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
              {preview.isError
                ? 'Could not count the open offers and deliveries; stopping still works.'
                : preview.data
                ? `This ends ${preview.data.offersToEnd} open ${
                    preview.data.offersToEnd === 1 ? 'offer' : 'offers'
                  } and sends ${preview.data.deliveriesToReturn} ${
                    preview.data.deliveriesToReturn === 1 ? 'delivery' : 'deliveries'
                  } not yet picked up back to waiting. Riders who lose a delivery are paid by the co-op's reassignment setting.`
                : 'Counting open offers and deliveries not yet picked up…'}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label htmlFor="stop-reason">Reason</Label>
              <select
                id="stop-reason"
                className={SELECT_CLASS}
                value={reason}
                onChange={(e) => setReason(e.target.value as DispatchStopReason)}
              >
                {(Object.keys(REASON_LABELS) as DispatchStopReason[]).map((value) => (
                  <option key={value} value={value}>
                    {REASON_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'schedule' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="stop-start-date">Starts on</Label>
                  <Input
                    id="stop-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stop-start-time">At</Label>
                  <Input
                    id="stop-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  id="stop-has-end"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={hasEnd}
                  onChange={(e) => setHasEnd(e.target.checked)}
                />
                <Label htmlFor="stop-has-end">Set an end time (otherwise until you restart)</Label>
              </div>
            )}

            {needsEnd ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="stop-end-date">Ends on</Label>
                  <Input id="stop-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stop-end-time">At</Label>
                  <Input id="stop-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" disabled={isLoading} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={mode === 'now' ? 'destructive' : 'default'} disabled={!isValid || isLoading}>
              {isLoading ? <Spinner className="mr-2" /> : null}
              {mode === 'now' ? 'Stop dispatch' : 'Schedule stop'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
