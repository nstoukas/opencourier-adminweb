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
import { useTranslation } from 'react-i18next'
import { useFormat } from '@/i18n/useFormat'
import { useServerText } from '@/i18n/useServerText'
import { athensDateTime, athensEnd, effectiveEnd, reasonLabel, stopOutcome } from './dispatchStopDisplay'
import { StopDispatchDialog } from './StopDispatchDialog'

// Who sees this: any admin. It shows whether dispatch is on, the stop on now, and the next one, with
// the buttons to stop, schedule, restart and cancel (spec 0014, AC-9).
export function DispatchPanel() {
  const { toast } = useToast()
  // useTranslation gives t, which looks a key up in the reader's language; the panel redraws on a switch.
  const { t } = useTranslation()
  // The reader's language, for the weekday and month words of a stop's times.
  const { language } = useFormat()
  // errorText: the server's refusal in the reader's language when it sent a known code, else its own words.
  const { errorText } = useServerText()
  // A stop starts and ends on its own (the backend's minute tick), so the panel asks again every 30 s
  // while the tab is visible, as the deliveries list does.
  const pageVisible = usePageVisible()
  const overview = useGetDispatchStopsQuery(undefined, { pollingInterval: pageVisible ? 30_000 : 0 })
  const [endStop, { isLoading: ending }] = useEndDispatchStopMutation()
  // Open and mode are kept apart, so closing the dialog changes only `open`: Radix plays the closing
  // animation with the same title and the same focus target (row 29 review).
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'now' | 'schedule'>('now')
  const openDialog = (mode: 'now' | 'schedule') => {
    setDialogMode(mode)
    setDialogOpen(true)
  }
  const [historyOpen, setHistoryOpen] = useState(false)
  const stopNowRef = useRef<HTMLButtonElement>(null)
  const scheduleRef = useRef<HTMLButtonElement>(null)
  const historyRef = useRef<HTMLButtonElement>(null)

  const current = overview.data?.current ?? null
  // Every scheduled stop, soonest first: a heat circular can cover several days (row 29 review).
  const scheduled = overview.data?.scheduled ?? []

  const end = async (stop: DispatchStopAdminDto, what: 'restart' | 'cancel') => {
    try {
      await endStop({ id: stop.id }).unwrap()
      toast({ title: t(what === 'restart' ? 'dispatchStop.panel.restarted' : 'dispatchStop.panel.cancelled') })
    } catch (err: unknown) {
      toast({ title: errorText(err, t('dispatchStop.panel.actionFailed')), variant: 'destructive' })
    }
  }

  return (
    <Card className={`mb-4 ${current ? 'border-destructive' : ''}`}>
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 text-sm" aria-live="polite">
          {overview.isLoading ? (
            <p className="text-muted-foreground">{t('dispatchStop.panel.loading')}</p>
          ) : overview.isError ? (
            <p className="text-destructive">{t('dispatchStop.panel.loadFailed')}</p>
          ) : current ? (
            <p className="font-medium text-destructive">
              {effectiveEnd(current)
                ? t('dispatchStop.panel.stoppedUntil', {
                    time: athensEnd(new Date().toISOString(), effectiveEnd(current) as string, language),
                    reason: reasonLabel(t, current.reason),
                  })
                : t('dispatchStop.panel.stoppedUntilRestart', { reason: reasonLabel(t, current.reason) })}
            </p>
          ) : (
            <p className="font-medium">{t('dispatchStop.panel.on')}</p>
          )}
          {scheduled.length > 0 ? (
            <ul className="text-muted-foreground">
              {scheduled.map((stop) => (
                <li key={stop.id}>
                  {stop.endsAt
                    ? t('dispatchStop.panel.scheduledTo', {
                        start: athensDateTime(stop.startsAt, language),
                        end: athensEnd(stop.startsAt, stop.endsAt, language),
                        reason: reasonLabel(t, stop.reason),
                      })
                    : t('dispatchStop.panel.scheduled', {
                        start: athensDateTime(stop.startsAt, language),
                        reason: reasonLabel(t, stop.reason),
                      })}{' '}
                  <button
                    type="button"
                    className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={ending}
                    aria-label={t('dispatchStop.panel.cancelStop', { time: athensDateTime(stop.startsAt, language) })}
                    onClick={() => end(stop, 'cancel')}
                  >
                    {t('dispatchStop.panel.cancel')}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {current ? (
            <Button type="button" disabled={ending} onClick={() => end(current, 'restart')}>
              {ending ? <Spinner className="mr-2" /> : null}
              {t('dispatchStop.panel.restartNow')}
            </Button>
          ) : (
            <Button ref={stopNowRef} type="button" variant="destructive" onClick={() => openDialog('now')}>
              {t('dispatchStop.panel.stopNow')}
            </Button>
          )}
          <Button ref={scheduleRef} type="button" variant="outline" onClick={() => openDialog('schedule')}>
            {t('dispatchStop.panel.schedule')}
          </Button>
          <Button ref={historyRef} type="button" variant="ghost" onClick={() => setHistoryOpen(true)}>
            {t('dispatchStop.panel.history')}
          </Button>
        </div>
      </CardContent>

      <StopDispatchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        // After Stop now the button may be gone (Restart now replaces it): focus Schedule instead.
        returnFocusTo={dialogMode === 'schedule' || current ? scheduleRef : stopNowRef}
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
            <DialogTitle>{t('dispatchStop.panel.historyTitle')}</DialogTitle>
          </DialogHeader>
          {(overview.data?.history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dispatchStop.panel.noStops')}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">{t('dispatchStop.panel.columnReason')}</th>
                  <th className="py-2 pr-3 font-medium">{t('dispatchStop.panel.columnFrom')}</th>
                  <th className="py-2 pr-3 font-medium">{t('dispatchStop.panel.columnTo')}</th>
                  <th className="py-2 pr-3 font-medium">{t('dispatchStop.panel.columnBy')}</th>
                  <th className="py-2 font-medium">{t('dispatchStop.panel.columnOutcome')}</th>
                </tr>
              </thead>
              <tbody>
                {(overview.data?.history ?? []).map((stop) => (
                  <tr key={stop.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-3">{reasonLabel(t, stop.reason)}</td>
                    <td className="py-2 pr-3">{athensDateTime(stop.startsAt, language)}</td>
                    <td className="py-2 pr-3">
                      {stop.endsAt ? athensDateTime(stop.endsAt, language) : t('dispatchStop.panel.untilRestarted')}
                    </td>
                    <td className="py-2 pr-3 font-mono" title={stop.createdByUserId}>
                      {stop.createdByUserId.slice(-6)}
                    </td>
                    <td className="py-2">{stopOutcome(t, language, stop)}</td>
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
