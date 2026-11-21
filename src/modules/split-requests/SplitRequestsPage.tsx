import React, { useState } from 'react'
import Link from 'next/link'
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
import { SPLIT_COUNT_POLL_MS } from './SplitRequestsBadge'

const SIZE_WORDS: Record<string, string> = { SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large' }
const SIZES: SplitBoxSize[] = ['SMALL', 'MEDIUM', 'LARGE']

// "2 boxes: Large and Small".
export function legsWords(legs: SplitLegAdmin[]): string {
  const words = legs.map((leg) => SIZE_WORDS[leg.boxSize] ?? leg.boxSize)
  const list = words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words.join('')
  return `${legs.length} boxes: ${list}`
}

// The backend's own sentence for a refused answer (a 409 "already answered"), else a general one.
function problemText(error: unknown): string {
  const message = (error as { message?: unknown } | undefined)?.message
  return typeof message === 'string' && message ? message : 'The answer could not be saved. Try again.'
}

// Spec 0047 (AC-4): the Split requests queue. A rider at a restaurant found an order that does not fit one box
// and proposed the boxes; confirm as proposed, change the boxes, or refuse ("It fits"). The rider keeps box 1;
// every other box becomes a new delivery paid in full, charged to the restaurant. The rider is paid while
// waiting, so the oldest request leads.
export function SplitRequestsPage() {
  const pageVisible = usePageVisible()
  const { data, isError, isLoading } = useGetSplitRequestsQuery(undefined, {
    pollingInterval: pageVisible ? SPLIT_COUNT_POLL_MS : 0,
  })
  const rows = data ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title="Split requests"
        description="Riders at a restaurant whose order does not fit one box. The rider keeps the first box; each other box goes as its own delivery, paid in full and charged to the restaurant."
      />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading split requests…</p> : null}
      {isError && !data ? <p className="text-sm text-destructive">The split requests could not be loaded.</p> : null}
      {data && rows.length === 0 ? <p className="text-sm text-muted-foreground">No rider is waiting for a split.</p> : null}
      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead>Rider</TableHead>
              <TableHead>Proposed</TableHead>
              <TableHead>Waiting</TableHead>
              <TableHead>Answer</TableHead>
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
  const [confirm, { isLoading: confirming }] = useConfirmSplitRequestMutation()
  const [refuse, { isLoading: refusing }] = useRefuseSplitRequestMutation()
  // Editing the boxes before confirming (AC-4), and the refusal's optional sentence.
  const [legs, setLegs] = useState<SplitLegAdmin[] | null>(null)
  const [refusing_, setRefusingOpen] = useState(false)
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const busy = confirming || refusing

  const answer = async (run: () => Promise<unknown>) => {
    setProblem(null)
    try {
      await run()
    } catch (error) {
      setProblem(problemText(error))
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
            Leg {request.legNumber} of {request.legCount}
          </div>
        ) : null}
      </TableCell>
      <TableCell>{request.courierName || '—'}</TableCell>
      <TableCell>
        <div>{legsWords(request.proposedLegs)}</div>
        <div className="text-xs text-muted-foreground">Sent as {SIZE_WORDS[request.currentBoxSize] ?? request.currentBoxSize}</div>
        {legs ? (
          <fieldset className="mt-2 space-y-1" aria-label="Boxes to confirm">
            {legs.map((leg, index) => (
              <label key={index} className="flex items-center gap-2 text-sm">
                Box {index + 1}
                <select
                  className="rounded border px-1 py-0.5"
                  value={leg.boxSize}
                  onChange={(event) =>
                    setLegs(legs.map((item, i) => (i === index ? { boxSize: event.target.value as SplitBoxSize } : item)))
                  }
                >
                  {SIZES.map((size) => (
                    <option key={size} value={size}>
                      {SIZE_WORDS[size]}
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
                Add a box
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={legs.length <= 2}
                onClick={() => setLegs(legs.slice(0, -1))}
              >
                Remove the last box
              </Button>
            </div>
          </fieldset>
        ) : null}
      </TableCell>
      <TableCell>{request.waitedMinutes} min</TableCell>
      <TableCell className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={sendConfirm}>
            {legs ? `Split into ${legs.length}` : 'Confirm'}
          </Button>
          {legs ? null : (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setLegs(request.proposedLegs)}>
              Change boxes
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setRefusingOpen(!refusing_)}>
            It fits
          </Button>
        </div>
        {refusing_ ? (
          <div className="space-y-1">
            <label className="block text-xs text-muted-foreground" htmlFor={`note-${request.id}`}>
              A sentence for the rider (optional)
            </label>
            <input
              id={`note-${request.id}`}
              className="w-full rounded border px-2 py-1 text-sm"
              maxLength={300}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={sendRefuse}>
              Refuse the split
            </Button>
          </div>
        ) : null}
        {problem ? (
          <p role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
