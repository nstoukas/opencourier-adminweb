import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useGetInstanceConfigQuery } from '@/api/configApi'
import { useGetDispatchBoardQuery } from '@/api/dispatchBoardApi'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/admin-web-components'
import type { DispatchBoardDto } from '@/backend-admin-sdk'
import { PageHeader } from '@/components/layouts/PageHeader'
import { usePageVisible } from '@/hooks/usePageVisible'
import { athensEnd } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { AttentionList } from './AttentionList'
import { BUSY_COLOR, FREE_COLOR, STALE_AFTER_SECONDS, WAITING_COLOR } from './dispatchDisplay'

const POLL_MS = 10_000

// `ssr: false`: Leaflet needs `window`, which does not exist while the server draws the page.
const DispatchMap = dynamic(() => import('./DispatchMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full" />,
})

const LEGEND = [
  { label: 'Free', swatch: 'rounded-full', color: FREE_COLOR },
  { label: 'Busy', swatch: 'rounded-full', color: BUSY_COLOR },
  { label: 'Waiting', swatch: 'rounded-sm', color: WAITING_COLOR },
]

function StatCard({
  label,
  value,
  line,
  warning = false,
}: {
  label: string
  value: number
  line: string
  warning?: boolean
}) {
  return (
    <Card className={warning ? 'bg-warning-soft' : undefined} data-testid={`stat-${label}`}>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{line}</p>
      </CardContent>
    </Card>
  )
}

function Cards({ cards }: { cards: DispatchBoardDto['cards'] }) {
  const { active, waiting, couriers, deliveredToday } = cards
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Active deliveries"
        value={active.total}
        line={`${active.toPickup} to pickup · ${active.toDropoff} to dropoff`}
      />
      <StatCard
        label="Waiting for a courier"
        value={waiting.total}
        line={waiting.oldestWaitingMinutes === null ? 'Nothing waiting' : `Oldest waiting ${waiting.oldestWaitingMinutes} min`}
        warning={waiting.total > 0}
      />
      <StatCard
        label="Couriers online"
        value={couriers.total}
        line={`${couriers.busy} busy · ${couriers.free} free · ${couriers.lastCall} on Last Call`}
      />
      <StatCard
        label="Delivered today"
        value={deliveredToday.total}
        line={deliveredToday.medianMinutes === null ? 'No deliveries yet' : `Median ${deliveredToday.medianMinutes} min door to door`}
      />
    </div>
  )
}

function DispatchSkeleton() {
  return (
    <div className="space-y-4" data-testid="dispatch-skeleton">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

// Spec 0034: what is waiting, what is stuck and where working riders are, from one answer asked
// every 10 s. Nothing here times, counts or ranks a rider (AC-10).
export function DispatchPage() {
  const pageVisible = usePageVisible()
  // RTK Query keeps the last good `data` when a poll fails, so the page stays on screen (AC-15).
  // `refetchOnMountOrArgChange`: coming back to this page asks at once, instead of showing the
  // cached board until the next poll. `fulfilledTimeStamp` is when the last good answer arrived,
  // so a cached board can never read as just updated (review of row 90).
  const { data, isError, refetch, fulfilledTimeStamp } = useGetDispatchBoardQuery(undefined, {
    pollingInterval: pageVisible ? POLL_MS : 0,
    refetchOnMountOrArgChange: true,
  })
  const { data: config } = useGetInstanceConfigQuery({})
  const region = (config?.details as { region?: unknown } | null | undefined)?.region
  const lastGoodAt = fulfilledTimeStamp ?? null

  // Ticks once a second, for "updated N s ago" and each row's minutes.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!pageVisible) return
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pageVisible])

  // Polling restarts ten seconds after the tab comes back: ask at once instead.
  useEffect(() => {
    // `void`: nothing waits for this; a failed answer shows through `isError` like any poll.
    // Only when the tab comes back, not on every answer, so `lastGoodAt` is left out of the list.
    if (pageVisible && lastGoodAt !== null) void refetch()
  }, [pageVisible])

  const secondsAgo = lastGoodAt === null ? null : Math.max(0, Math.floor((nowMs - lastGoodAt) / 1000))
  const unreachable = isError && (secondsAgo === null || secondsAgo > STALE_AFTER_SECONDS)
  const description = unreachable
    ? "Can't reach the server"
    : secondsAgo === null
      ? 'live'
      : `live, updated ${secondsAgo} s ago`

  return (
    <>
      <PageHeader
        title="Dispatch"
        description={description}
        action={
          <Button asChild variant="outline">
            <Link href="/deliveries">All Deliveries</Link>
          </Button>
        }
      />
      {data?.dispatchStop.active ? (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>Dispatch is stopped</AlertTitle>
          <AlertDescription>
            {data.dispatchStop.until
              ? `Until ${athensEnd(data.generatedAt, data.dispatchStop.until)}.`
              : 'Until an admin restarts it.'}
          </AlertDescription>
        </Alert>
      ) : null}
      {!data && isError ? (
        <Alert variant="destructive">
          <AlertTitle>Can&apos;t reach the server</AlertTitle>
          <AlertDescription>Trying again every 10 seconds.</AlertDescription>
        </Alert>
      ) : !data ? (
        <DispatchSkeleton />
      ) : (
        <div className="space-y-4">
          <Cards cards={data.cards} />
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <AttentionList rows={data.attention} more={data.attentionMore} nowMs={nowMs} />
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
                <CardTitle className="text-lg">Live map</CardTitle>
                <ul className="flex items-center gap-3 text-xs text-muted-foreground" aria-label="Map legend">
                  {LEGEND.map((item) => (
                    <li key={item.label} className="flex items-center gap-1">
                      <span
                        aria-hidden="true"
                        className={`inline-block size-2.5 ${item.swatch}`}
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </CardHeader>
              <CardContent className="space-y-2">
                <DispatchMap map={data.map} region={region} />
                {data.map.couriers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No riders working right now</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
