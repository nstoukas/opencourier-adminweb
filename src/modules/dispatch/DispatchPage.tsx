import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
// useTranslation gives t, which looks a key up in the reader's language.
import { useTranslation } from 'react-i18next'
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
import { useFormat } from '@/i18n/useFormat'
import { athensEnd } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { AttentionList } from './AttentionList'
import { BUSY_COLOR, FREE_COLOR, STALE_AFTER_SECONDS, WAITING_COLOR } from './dispatchDisplay'

const POLL_MS = 10_000

// `ssr: false`: Leaflet needs `window`, which does not exist while the server draws the page.
const DispatchMap = dynamic(() => import('./DispatchMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full" />,
})

// Each item's words are a translation key, looked up when the legend draws.
const LEGEND = [
  { label: 'dispatch.map.free', swatch: 'rounded-full', color: FREE_COLOR },
  { label: 'dispatch.map.busy', swatch: 'rounded-full', color: BUSY_COLOR },
  { label: 'dispatch.map.waiting', swatch: 'rounded-sm', color: WAITING_COLOR },
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
  const { t } = useTranslation()
  const { active, waiting, couriers, deliveredToday } = cards
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={t('dispatch.cards.active')}
        value={active.total}
        line={t('dispatch.cards.activeLine', { toPickup: active.toPickup, toDropoff: active.toDropoff })}
      />
      <StatCard
        label={t('dispatch.cards.waiting')}
        value={waiting.total}
        line={
          waiting.oldestWaitingMinutes === null
            ? t('dispatch.cards.nothingWaiting')
            : t('dispatch.cards.oldestWaiting', { minutes: waiting.oldestWaitingMinutes })
        }
        warning={waiting.total > 0}
      />
      <StatCard
        label={t('dispatch.cards.couriers')}
        value={couriers.total}
        line={t('dispatch.cards.couriersLine', { busy: couriers.busy, free: couriers.free, lastCall: couriers.lastCall })}
      />
      <StatCard
        label={t('dispatch.cards.delivered')}
        value={deliveredToday.total}
        line={
          deliveredToday.medianMinutes === null
            ? t('dispatch.cards.noDeliveries')
            : t('dispatch.cards.median', { minutes: deliveredToday.medianMinutes })
        }
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
  const { t } = useTranslation()
  const f = useFormat()
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
    ? t('dispatch.unreachable')
    : secondsAgo === null
      ? t('dispatch.live')
      : t('dispatch.liveUpdated', { seconds: secondsAgo })

  return (
    <>
      <PageHeader
        title={t('dispatch.title')}
        description={description}
        action={
          <Button asChild variant="outline">
            <Link href="/deliveries">{t('dispatch.allDeliveries')}</Link>
          </Button>
        }
      />
      {data?.dispatchStop.active ? (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>{t('dispatch.stopped')}</AlertTitle>
          <AlertDescription>
            {data.dispatchStop.until
              ? t('dispatch.until', { time: athensEnd(data.generatedAt, data.dispatchStop.until, f.language) })
              : t('dispatch.untilRestart')}
          </AlertDescription>
        </Alert>
      ) : null}
      {!data && isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('dispatch.unreachable')}</AlertTitle>
          <AlertDescription>{t('dispatch.retrying')}</AlertDescription>
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
                <CardTitle className="text-lg">{t('dispatch.map.title')}</CardTitle>
                <ul className="flex items-center gap-3 text-xs text-muted-foreground" aria-label={t('dispatch.map.legendLabel')}>
                  {LEGEND.map((item) => (
                    <li key={item.label} className="flex items-center gap-1">
                      <span
                        aria-hidden="true"
                        className={`inline-block size-2.5 ${item.swatch}`}
                        style={{ backgroundColor: item.color }}
                      />
                      {t(item.label)}
                    </li>
                  ))}
                </ul>
              </CardHeader>
              <CardContent className="space-y-2">
                <DispatchMap map={data.map} region={region} />
                {data.map.couriers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('dispatch.map.noRiders')}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
