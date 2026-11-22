import React, { useState } from 'react'
import Link from 'next/link'
import type { TFunction } from 'i18next'
// useTranslation gives t, which looks a key up in the reader's language.
import { useTranslation } from 'react-i18next'
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/admin-web-components'
import type { SplitBoxSize, SplitLegAdmin, SplitRequestAdminDto } from '@/backend-admin-sdk'
import {
  useConfirmSplitRequestMutation,
  useGetSplitRequestsQuery,
  useRefuseSplitRequestMutation,
} from '@/api/splitRequestApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { usePageVisible } from '@/hooks/usePageVisible'
import { shortId } from '@/utils/shortId'
import { useFormat } from '@/i18n/useFormat'
import { useServerText } from '@/i18n/useServerText'
import { SPLIT_COUNT_POLL_MS } from './SplitRequestsBadge'

const SIZES: SplitBoxSize[] = ['SMALL', 'MEDIUM', 'LARGE']

// A box size in the reader's language ("Large", "Μεγάλη"); a size the backend added later reads as it came.
function sizeWord(t: TFunction, size: string): string {
  return t(`splitRequests.size.${size}`, { defaultValue: size })
}

// "2 boxes: Large and Small". Takes `t` (i18next's translate function) because the words carry values.
export function legsWords(legs: SplitLegAdmin[], t: TFunction): string {
  const words = legs.map((leg) => sizeWord(t, leg.boxSize))
  const list =
    words.length > 1
      ? t('splitRequests.listAnd', { first: words.slice(0, -1).join(', '), last: words[words.length - 1] })
      : words.join('')
  // `count` picks the plural form (Greek says "1 κουτί", "2 κουτιά").
  return t('splitRequests.legs', { count: legs.length, list })
}

// Spec 0047 (AC-4): the Split requests queue. A rider at a restaurant found an order that does not fit one box
// and proposed the boxes; confirm as proposed, change the boxes, or refuse ("It fits"). The rider keeps box 1;
// every other box becomes a new delivery paid in full, charged to the restaurant. The rider is paid while
// waiting, so the oldest request leads.
export function SplitRequestsPage() {
  const { t } = useTranslation()
  const pageVisible = usePageVisible()
  const { data, isError, isLoading } = useGetSplitRequestsQuery(undefined, {
    pollingInterval: pageVisible ? SPLIT_COUNT_POLL_MS : 0,
  })
  const rows = data ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('splitRequests.title')}
        description={t('splitRequests.description')}
      />
      {isLoading ? <p className="text-sm text-muted-foreground">{t('splitRequests.loading')}</p> : null}
      {isError && !data ? <p className="text-sm text-destructive">{t('splitRequests.loadFailed')}</p> : null}
      {data && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t('splitRequests.empty')}</p> : null}
      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('splitRequests.columns.restaurant')}</TableHead>
              <TableHead>{t('splitRequests.columns.rider')}</TableHead>
              <TableHead>{t('splitRequests.columns.proposed')}</TableHead>
              <TableHead>{t('splitRequests.columns.waiting')}</TableHead>
              <TableHead>{t('splitRequests.columns.answer')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((request) => (
              <SplitRequestRow key={request.id} request={request} />
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  )
}

function SplitRequestRow({ request }: { request: SplitRequestAdminDto }) {
  const { t } = useTranslation()
  const f = useFormat()
  // errorText: the server's refusal (a 409 "already answered") in the reader's language, else the fallback.
  const { errorText } = useServerText()
  const [confirm, { isLoading: confirming }] = useConfirmSplitRequestMutation()
  const [refuse, { isLoading: refusing }] = useRefuseSplitRequestMutation()
  // Editing the boxes before confirming (AC-4), and the refusal's optional sentence.
  const [legs, setLegs] = useState<SplitLegAdmin[] | null>(null)
  const [refusing_, setRefusingOpen] = useState(false)
  const [note, setNote] = useState('')
  // The refusal itself, not its words: they are made when it draws, so a language switch reaches it.
  const [problem, setProblem] = useState<{ error: unknown } | null>(null)
  const busy = confirming || refusing

  const answer = async (run: () => Promise<unknown>) => {
    setProblem(null)
    try {
      await run()
    } catch (error) {
      setProblem({ error })
    }
  }
  const sendConfirm = () =>
    answer(() => confirm({ id: request.id, ...(legs ? { legs } : {}) }).unwrap())
  const sendRefuse = () => answer(() => refuse({ id: request.id, ...(note.trim() ? { note: note.trim() } : {}) }).unwrap())

  return (
    <TableRow data-testid={`split-request-${request.id}`}>
      <TableCell>
        <div className="font-medium">{request.restaurantName || '—'}</div>
        <Link href={`/deliveries/${request.deliveryId}`} className="font-mono text-xs underline">
          {shortId(request.deliveryId)}
        </Link>
        {request.legNumber && request.legCount ? (
          <div className="text-xs text-muted-foreground">
            {t('splitRequests.leg', { number: request.legNumber, total: request.legCount })}
          </div>
        ) : null}
      </TableCell>
      <TableCell>{request.courierName || '—'}</TableCell>
      <TableCell>
        <div>{legsWords(request.proposedLegs, t)}</div>
        <div className="text-xs text-muted-foreground">
          {t('splitRequests.sentAs', { size: sizeWord(t, request.currentBoxSize) })}
        </div>
        {legs ? (
          <fieldset className="mt-2 space-y-1" aria-label={t('splitRequests.boxesToConfirm')}>
            {legs.map((leg, index) => (
              <label key={index} className="flex items-center gap-2 text-sm">
                {t('splitRequests.box', { number: index + 1 })}
                <select
                  className="rounded border px-1 py-0.5"
                  value={leg.boxSize}
                  onChange={(event) =>
                    setLegs(legs.map((item, i) => (i === index ? { boxSize: event.target.value as SplitBoxSize } : item)))
                  }
                >
                  {SIZES.map((size) => (
                    <option key={size} value={size}>
                      {sizeWord(t, size)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={legs.length >= 4}
                onClick={() => setLegs([...legs, { boxSize: 'SMALL' }])}
              >
                {t('splitRequests.addBox')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={legs.length <= 2}
                onClick={() => setLegs(legs.slice(0, -1))}
              >
                {t('splitRequests.removeBox')}
              </Button>
            </div>
          </fieldset>
        ) : null}
      </TableCell>
      <TableCell>
        {t('common.minutes', { count: request.waitedMinutes })}
        {/* Row 11 review: when the rider may leave the order unsplit, in Athens time. */}
        {request.leaveFrom ? (
          <span className="block text-xs text-muted-foreground">
            {t('splitRequests.mayLeave', { time: f.time(request.leaveFrom) })}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={sendConfirm}>
            {legs ? t('splitRequests.splitInto', { number: legs.length }) : t('common.confirm')}
          </Button>
          {legs ? null : (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setLegs(request.proposedLegs)}>
              {t('splitRequests.changeBoxes')}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setRefusingOpen(!refusing_)}>
            {t('splitRequests.itFits')}
          </Button>
        </div>
        {refusing_ ? (
          <div className="space-y-1">
            <label className="block text-xs text-muted-foreground" htmlFor={`note-${request.id}`}>
              {t('splitRequests.noteLabel')}
            </label>
            <input
              id={`note-${request.id}`}
              className="w-full rounded border px-2 py-1 text-sm"
              maxLength={300}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={sendRefuse}>
              {t('splitRequests.refuse')}
            </Button>
          </div>
        ) : null}
        {problem ? (
          <p role="alert" className="text-sm text-destructive">
            {errorText(problem.error, t('splitRequests.saveFailed'))}
          </p>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
