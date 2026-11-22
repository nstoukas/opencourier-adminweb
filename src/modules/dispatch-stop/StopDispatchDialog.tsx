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
import { useTranslation } from 'react-i18next'
import { useServerText } from '@/i18n/useServerText'
import { keyMessage, showMessage, textMessage, type ShownMessage } from '@/i18n/shownMessage'
import { REASON_KEYS, athensToday, reasonLabel } from './dispatchStopDisplay'

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
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const { errorText } = useServerText()
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
  // A key or the server's words, translated when drawn, so a language switch reaches it (shownMessage.ts).
  const [error, setError] = useState<ShownMessage | null>(null)

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
      toast({ title: t(mode === 'now' ? 'dispatchStop.dialog.stopped' : 'dispatchStop.dialog.scheduled') })
      onOpenChange(false)
    } catch (err: unknown) {
      // The backend names what is wrong ("Another dispatch stop already covers part of that time.").
      // The server's own words when it sent some ("Another dispatch stop already covers part of that time."),
      // else our sentence, kept as its key so it is translated when drawn.
      const fallback = 'dispatchStop.dialog.saveFailed'
      const words = errorText(err, fallback)
      setError(words === fallback ? keyMessage(fallback) : textMessage(words))
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
            <DialogTitle>
              {t(mode === 'now' ? 'dispatchStop.dialog.titleNow' : 'dispatchStop.dialog.titleSchedule')}
            </DialogTitle>
            <DialogDescription>{t('dispatchStop.dialog.description')}</DialogDescription>
          </DialogHeader>

          {mode === 'now' ? (
            <p role="note" className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
              {preview.isError
                ? t('dispatchStop.dialog.previewFailed')
                : preview.data
                ? t('dispatchStop.dialog.preview', {
                    offers: t('dispatchStop.dialog.offers', { count: preview.data.offersToEnd }),
                    deliveries: t('dispatchStop.dialog.deliveries', { count: preview.data.deliveriesToReturn }),
                  })
                : t('dispatchStop.dialog.counting')}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {showMessage(error, t)}
            </p>
          ) : null}

          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label htmlFor="stop-reason">{t('dispatchStop.dialog.reason')}</Label>
              <select
                id="stop-reason"
                className={SELECT_CLASS}
                value={reason}
                onChange={(e) => setReason(e.target.value as DispatchStopReason)}
              >
                {(Object.keys(REASON_KEYS) as DispatchStopReason[]).map((value) => (
                  <option key={value} value={value}>
                    {reasonLabel(t, value)}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'schedule' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="stop-start-date">{t('dispatchStop.dialog.startsOn')}</Label>
                  <Input
                    id="stop-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stop-start-time">{t('dispatchStop.dialog.at')}</Label>
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
                <Label htmlFor="stop-has-end">{t('dispatchStop.dialog.hasEnd')}</Label>
              </div>
            )}

            {needsEnd ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="stop-end-date">{t('dispatchStop.dialog.endsOn')}</Label>
                  <Input id="stop-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stop-end-time">{t('dispatchStop.dialog.at')}</Label>
                  <Input id="stop-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" disabled={isLoading} onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant={mode === 'now' ? 'destructive' : 'default'} disabled={!isValid || isLoading}>
              {isLoading ? <Spinner className="mr-2" /> : null}
              {t(mode === 'now' ? 'dispatchStop.dialog.submitNow' : 'dispatchStop.dialog.submitSchedule')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
