import { useGetCourierQuery } from '@/api/couriersApi'
import { useGetDeliveriesQuery } from '@/api/deliveriesApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { usePageVisible } from '@/hooks/usePageVisible'
import { formatMoney } from '@/utils/formatMoney'
import { shortId } from '@/utils/shortId'
import { formatDate } from '@/ui-shared-utils'
import { PhoneCall } from '@phosphor-icons/react'
import { Breadcrumb, Card, CardContent, CardHeader, CardTitle, DetailList, StatusBadge } from '@/admin-web-components'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'
import { courierName, deliverySettingLabel, memberSince } from './courierDisplay'

// How many deliveries each card asks for (spec 0012). A rider carries one or two at a time.
const DELIVERIES_PER_CARD = 10

// A rider's progress is made in the courier app and reaches this page only if the page asks
// again, so it asks every 30 s, as the deliveries list and a delivery's page do (row 89 review).
const REFRESH_MS = 30_000

// One delivery in a card: its reference and short id, restaurant → customer, status, and
// whatever the card adds on the right (the rider's pay in Recent deliveries). Links to it.
function DeliveryRow({
  delivery,
  onOpen,
  extra,
}: {
  delivery: DeliveryAdminDto
  onOpen: (id: string) => void
  extra?: React.ReactNode
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0">
        <a
          href={`/deliveries/${delivery.id}`}
          onClick={(event) => {
            // A ctrl, cmd, shift or middle click opens a new tab as the browser normally does.
            if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
              event.preventDefault()
              onOpen(delivery.id)
            }
          }}
          className="text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {delivery.orderReference ? `${delivery.orderReference} · ` : ''}
          <span className="font-mono">{shortId(delivery.id)}</span>
        </a>
        <p className="text-xs text-muted-foreground">
          {delivery.pickupBusinessName || '—'} → {delivery.dropoffName || '—'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {extra}
        {/* A minimum width, so the date and pay line up for the usual labels, and a long one
            ("Courier at Dropoff") widens the slot instead of covering the pay. */}
        <span className="flex min-w-28 justify-end">
          <StatusBadge status={delivery.status} />
        </span>
      </div>
    </li>
  )
}

// A rider's page (spec 0012): who they are, what they carry now, their recent deliveries.
// Nothing here rates, counts or watches a rider (value 5): no acceptance rate, no online time,
// no totals, no location.
export function CourierDetails({ courierId }: { courierId: string }) {
  const { goToCouriers, goToDeliveryDetails } = useAdminPageNavigator()
  // 0 while the tab is in the background: RTK Query does not poll at 0.
  const pageVisible = usePageVisible()
  const pollingInterval = pageVisible ? REFRESH_MS : 0
  const courierQuery = useGetCourierQuery({ id: courierId }, { skip: !courierId, pollingInterval })
  // `currentData` is the answer for THIS id only (`data` would keep the previous rider's record
  // while the next one loads, so going back between two riders would flash the wrong name).
  const courier = courierQuery.currentData
  // The two delivery lists wait for the courier, so a wrong id asks for nothing more.
  const nowQuery = useGetDeliveriesQuery(
    { courierId, state: 'active', page: 1, perPage: DELIVERIES_PER_CARD },
    { skip: !courier, pollingInterval }
  )
  const recentQuery = useGetDeliveriesQuery(
    { courierId, page: 1, perPage: DELIVERIES_PER_CARD },
    { skip: !courier, pollingInterval }
  )

  // The h1 is there in every state ("Courier" while loading or on an error).
  if (courierQuery.isLoading || (!courier && !courierQuery.isError && courierId)) {
    return (
      <>
        <PageHeader title="Courier" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </>
    )
  }
  if (!courier) {
    return (
      <>
        <PageHeader title="Courier" />
        <p className="text-sm text-muted-foreground">Courier not found or could not be loaded.</p>
      </>
    )
  }

  const name = courierName(courier)
  const firstName = courier.firstName.trim()

  return (
    <>
      <Breadcrumb
        steps={[
          {
            label: 'Couriers',
            href: '/couriers',
            onClick: () => goToCouriers(),
          },
          { label: name },
        ]}
      />
      <PageHeader
        title={name}
        action={
          courier.phoneNumber ? (
            // A plain link styled as the design system's default button: the phone dials it.
            <a
              href={`tel:${courier.phoneNumber}`}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PhoneCall aria-hidden="true" className="h-4 w-4" />
              {firstName ? `Call ${firstName}` : 'Call'}
            </a>
          ) : undefined
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <StatusBadge kind="courier" status={courier.status} />
        <span>{courier.phoneNumber ?? 'No phone'}</span>
        <span>Member since {memberSince(courier.createdAt)}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Right now</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {nowQuery.isLoading ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : nowQuery.isError ? (
                <p className="text-destructive">Could not load deliveries.</p>
              ) : (nowQuery.data?.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">Not carrying a delivery</p>
              ) : (
                <ul>
                  {(nowQuery.data?.data ?? []).map((delivery) => (
                    <DeliveryRow key={delivery.id} delivery={delivery} onOpen={goToDeliveryDetails} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent deliveries</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {recentQuery.isLoading ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : recentQuery.isError ? (
                <p className="text-destructive">Could not load deliveries.</p>
              ) : (recentQuery.data?.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">No deliveries yet</p>
              ) : (
                <ul>
                  {(recentQuery.data?.data ?? []).map((delivery) => (
                    <DeliveryRow
                      key={delivery.id}
                      delivery={delivery}
                      onOpen={goToDeliveryDetails}
                      extra={
                        <span className="text-right text-xs text-muted-foreground">
                          {formatDate(delivery.createdAt)}
                          <span className="block font-medium tabular-nums text-foreground">
                            {formatMoney(delivery.totalCompensation, delivery.currencyCode) ?? '—'}
                          </span>
                        </span>
                      }
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Setup</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <DetailList
                items={[
                  {
                    label: 'Offers',
                    value: deliverySettingLabel(courier.deliverySetting),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
