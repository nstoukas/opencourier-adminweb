import { useState } from 'react'
import Link from 'next/link'
import { useMarkDeliveryIssueHandledMutation } from '@/api/deliveriesApi'
import { Button, Card, CardContent, CardHeader, CardTitle, useToast } from '@/admin-web-components'
import type { DispatchAttentionRowDto } from '@/backend-admin-sdk'
import { AssignCourierCell } from '@/modules/deliveries/components/AssignCourierCell'
import { isRedRow, minutesSince, rowHref } from './dispatchDisplay'

function OpenButton({ row }: { row: DispatchAttentionRowDto }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={rowHref(row)}>Open</Link>
    </Button>
  )
}

function MarkHandledButton({ row }: { row: DispatchAttentionRowDto }) {
  const { toast } = useToast()
  const [markHandled, { isLoading }] = useMarkDeliveryIssueHandledMutation()
  // Stays true until the board's refresh removes this row, so the button cannot be pressed again.
  const [saved, setSaved] = useState(false)
  const onClick = async () => {
    if (!row.deliveryId || !row.issueId) return
    try {
      await markHandled({ deliveryId: row.deliveryId, issueId: row.issueId }).unwrap()
      setSaved(true)
    } catch {
      toast({ title: 'Could not mark the report handled', variant: 'destructive' })
    }
  }
  return (
    <Button type="button" size="sm" disabled={isLoading || saved} onClick={onClick}>
      Mark Handled
    </Button>
  )
}

// The buttons a row offers. One `switch` for every kind; a kind this page does not know yet (a
// newer backend, rows 24 and 111) falls through to a plain Open, so an older tab never breaks.
function RowActions({ row }: { row: DispatchAttentionRowDto }) {
  switch (row.kind) {
    case 'WAITING_FOR_RIDER':
    case 'OFFER_UNANSWERED':
      return row.deliveryId && row.status ? (
        <AssignCourierCell delivery={{ id: row.deliveryId, status: row.status, courierId: row.courierId }} />
      ) : null
    case 'RIDER_REPORT':
      return (
        <>
          <OpenButton row={row} />
          <MarkHandledButton row={row} />
        </>
      )
    default:
      return <OpenButton row={row} />
  }
}

function AttentionRow({ row, nowMs }: { row: DispatchAttentionRowDto; nowMs: number }) {
  const [headline, ...rest] = row.detail.split('\n')
  const reference = row.orderReference ? `#${row.orderReference} · ` : ''
  // The offer row is the one kind that can arrive with no time (spec 0034, AC-5).
  const minutes = row.since === null ? null : minutesSince(row.since, nowMs)
  const whoAndWhere = [row.customerLabel, row.restaurantName ? `from ${row.restaurantName}` : null]
    .filter(Boolean)
    .join(' · ')
  // A report's note is its second line; a delivery still looking for a rider says who it is for.
  const second =
    rest.join('\n') || (row.kind === 'WAITING_FOR_RIDER' || row.kind === 'OFFER_UNANSWERED' ? whoAndWhere : '')

  return (
    <li
      data-testid="attention-row"
      data-kind={row.kind}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1.5 size-2.5 shrink-0 rounded-full ${isRedRow(row.kind) ? 'bg-destructive' : 'bg-warning'}`}
        />
        {/* The dot's meaning for anyone who cannot see its colour. */}
        <span className="sr-only">{isRedRow(row.kind) ? 'Nobody has taken this.' : 'Running.'}</span>
        <div className="min-w-0 space-y-0.5 text-sm">
          <p className="break-words font-medium">
            <Link href={rowHref(row)} className="hover:underline">
              {reference}
              {headline}
            </Link>
            {minutes !== null ? <span className="font-normal text-muted-foreground"> · {minutes} min</span> : null}
          </p>
          {second ? <p className="whitespace-pre-wrap break-words text-muted-foreground">{second}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <RowActions row={row} />
      </div>
    </li>
  )
}

type Props = {
  rows: DispatchAttentionRowDto[]
  more: number
  nowMs: number
}

// Everything that needs a person, SOS first and then the oldest, in the order the backend sends.
export function AttentionList({ rows, more, nowMs }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Needs attention · {rows.length + more}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing needs attention</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <AttentionRow key={row.id} row={row} nowMs={nowMs} />
            ))}
          </ul>
        )}
        {more > 0 ? <p className="mt-3 text-sm text-muted-foreground">and {more} more</p> : null}
      </CardContent>
    </Card>
  )
}
