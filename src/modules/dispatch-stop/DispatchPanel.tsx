import React, { useRef, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
  useToast,
} from '@/admin-web-components'
import { useEndDispatchStopMutation, useGetDispatchStopsQuery } from '@/api/dispatchStopApi'
import type { DispatchStopAdminDto } from '@/backend-admin-sdk'
import { usePageVisible } from '@/hooks/usePageVisible'
import { backendMessage } from '@/modules/couriers/courierAccountRules'
import { REASON_LABELS, athensDateTime, athensTime, effectiveEnd, stopOutcome } from './dispatchStopDisplay'
import { StopDispatchDialog } from './StopDispatchDialog'

// Who sees this: any admin. It shows whether dispatch is on, the stop on now, and the next one, with
// the buttons to stop, schedule, restart and cancel (spec 0014, AC-9).
export function DispatchPanel() {
  const { toast } = useToast()
  // A stop starts and ends on its own (the backend's minute tick), so the panel asks again every 30 s
  // while the tab is visible, as the deliveries list does.
  const pageVisible = usePageVisible()
  const overview = useGetDispatchStopsQuery(undefined, { pollingInterval: pageVisible ? 30_000 : 0 })
  const [endStop, { isLoading: ending }] = useEndDispatchStopMutation()
  const [dialog, setDialog] = useState<'now' | 'schedule' | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const stopNowRef = useRef<HTMLButtonElement>(null)
  const scheduleRef = useRef<HTMLButtonElement>(null)
  const historyRef = useRef<HTMLButtonElement>(null)

  const current = overview.data?.current ?? null
  const next = overview.data?.scheduled[0] ?? null

  const end = async (stop: DispatchStopAdminDto, what: 'restart' | 'cancel') => {
    try {
      await endStop({ id: stop.id }).unwrap()
      toast({ title: what === 'restart' ? 'Dispatch is on again.' : 'The scheduled stop is cancelled.' })
    } catch (err: unknown) {
      toast({ title: backendMessage(err, 'That did not work. Please try again.'), variant: 'destructive' })
    }
  }

  return (
    <Card className={`mb-4 ${current ? 'border-destructive' : ''}`}>
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 text-sm" aria-live="polite">
          {overview.isLoading ? (
            <p className="text-muted-foreground">Loading dispatch…</p>
          ) : overview.isError ? (
            <p className="text-destructive">Could not load whether dispatch is stopped.</p>
          ) : current ? (
            <p className="font-medium text-destructive">
              Dispatch is stopped{' '}
              {effectiveEnd(current) ? `until ${athensTime(effectiveEnd(current) as string)}` : 'until you restart it'} (
              {REASON_LABELS[current.reason]}).
            </p>
          ) : (
            <p className="font-medium">Dispatch is on.</p>
          )}
          {next ? (
            <p className="text-muted-foreground">
              Next stop: {athensDateTime(next.startsAt)}
              {next.endsAt ? ` to ${athensTime(next.endsAt)}` : ''} ({REASON_LABELS[next.reason]}).{' '}
              <button
                type="button"
                className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={ending}
                onClick={() => end(next, 'cancel')}
              >
                Cancel it
              </button>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {current ? (
            <Button type="button" disabled={ending} onClick={() => end(current, 'restart')}>
              {ending ? <Spinner className="mr-2" /> : null}
              Restart now
            </Button>
          ) : (
            <Button ref={stopNowRef} type="button" variant="destructive" onClick={() => setDialog('now')}>
              Stop now
            </Button>
          )}
          <Button ref={scheduleRef} type="button" variant="outline" onClick={() => setDialog('schedule')}>
            Schedule a stop
          </Button>
          <Button ref={historyRef} type="button" variant="ghost" onClick={() => setHistoryOpen(true)}>
            History
          </Button>
        </div>
      </CardContent>

      <StopDispatchDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        mode={dialog ?? 'now'}
        returnFocusTo={dialog === 'schedule' ? scheduleRef : stopNowRef}
      />

      {/* The record (spec 0014, AC-8): every stop, who started it and how it ended. */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          className="max-h-[80vh] overflow-y-auto sm:max-w-2xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            historyRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>Dispatch stops</DialogTitle>
          </DialogHeader>
          {(overview.data?.history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No stops yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 pr-3 font-medium">From</th>
                  <th className="py-2 pr-3 font-medium">To (planned)</th>
                  <th className="py-2 pr-3 font-medium">By</th>
                  <th className="py-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {(overview.data?.history ?? []).map((stop) => (
                  <tr key={stop.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-3">{REASON_LABELS[stop.reason]}</td>
                    <td className="py-2 pr-3">{athensDateTime(stop.startsAt)}</td>
                    <td className="py-2 pr-3">{stop.endsAt ? athensDateTime(stop.endsAt) : 'Until restarted'}</td>
                    <td className="py-2 pr-3 font-mono" title={stop.createdByUserId}>
                      {stop.createdByUserId.slice(-6)}
                    </td>
                    <td className="py-2">{stopOutcome(stop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
