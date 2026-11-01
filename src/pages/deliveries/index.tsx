import { useGetCouriersQuery } from '@/api/couriersApi'
import { useGetDeliveriesQuery } from '@/api/deliveriesApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { useNow } from '@/hooks/useNow'
import { usePageVisible } from '@/hooks/usePageVisible'
import { AssignCourierCell } from '@/modules/deliveries/components/AssignCourierCell'
import { deliveryOffer, isLookingForRider } from '@/modules/deliveries/utils/offer'
import { OfferSummary } from '@/modules/deliveries/components/OfferSummary'
import { Button, DEFAULT_PAGE_SIZE, DataTable, StatusBadge } from '../../admin-web-components'
import { DeliveryAdminDto } from '../../backend-admin-sdk'
import { formatMoney } from '@/utils/formatMoney'
import { shortId } from '@/utils/shortId'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import type { NextPage } from 'next'
import { useMemo, useState } from 'react'

function CourierResolvedName({
  courierId,
  nameById,
}: {
  courierId: string
  nameById: Map<string, string>
}) {
  const name = nameById.get(courierId)
  if (name) {
    return <span className="break-words text-sm">{name}</span>
  }
  return <span className="break-all font-mono text-xs text-muted-foreground">{courierId}</span>
}

// How often the Offer column is refreshed, in milliseconds.
const OFFER_REFRESH_MS = 30_000

const OrdersPage: NextPage = () => {
  const { goToDeliveryDetails } = useAdminPageNavigator()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  // The Offer column changes on its own (an offer expires, moves to the next rider, a rider
  // comes free), so the list asks the backend again every 30 s; `pollingInterval` is RTK
  // Query's built in timer for that. `now` ages the minutes shown between two fetches.
  const pageVisible = usePageVisible()
  const getOrdersResponse = useGetDeliveriesQuery(
    {
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
    },
    // 0 while the tab is in the background: RTK Query does not poll at 0.
    { pollingInterval: pageVisible ? OFFER_REFRESH_MS : 0 },
  )
  const now = useNow(OFFER_REFRESH_MS)

  const { data: couriersPayload } = useGetCouriersQuery({ page: 1, perPage: 500 })

  const courierNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of couriersPayload?.data ?? []) {
      const label = `${c.firstName} ${c.lastName}`.trim()
      map.set(c.id, label || c.id)
    }
    return map
  }, [couriersPayload?.data])

  // The board's columns (spec 0011, AC-1). The list has no working filter or search today: the
  // admin list route takes only the page, so the old ones filtered nothing (row 96 adds them).
  const columns: ColumnDef<DeliveryAdminDto>[] = useMemo(
    () => [
      {
        id: 'order',
        header: 'Order',
        cell: ({ row }) => {
          const d = row.original
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{d.orderReference || '—'}</span>
              {/* The last characters of the id, enough to tell deliveries apart; the full id on hover. */}
              <span className="font-mono text-xs text-muted-foreground" title={d.id}>
                {shortId(d.id)}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'restaurant',
        header: 'Restaurant',
        cell: ({ row }) => <span className="text-sm">{row.original.pickupBusinessName || '—'}</span>,
      },
      {
        id: 'deliverTo',
        header: 'Deliver to',
        cell: ({ row }) => <span className="text-sm">{row.original.dropoffName || '—'}</span>,
      },
      {
        // The rider who accepted; while the delivery is offered, who holds the offer and for how
        // long (spec 0002, AC-11); a dash when neither.
        id: 'courier',
        header: 'Courier',
        cell: ({ row }) => {
          const d = row.original
          if (d.courierId) return <CourierResolvedName courierId={d.courierId} nameById={courierNameById} />
          if (!isLookingForRider(d)) return <span className="text-muted-foreground">—</span>
          // The offer's own words, or "Looking for a rider" before the first offer goes out.
          return deliveryOffer(d) ? <OfferSummary delivery={d} now={now} /> : <span>Looking for a rider</span>
        },
      },
      {
        id: 'price',
        header: 'Price',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatMoney(row.original.totalCost, row.original.currencyCode) ?? '—'}
          </span>
        ),
      },
      {
        id: 'action',
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) => {
          const d = row.original
          return (
            // The row itself opens the delivery; the buttons stop that click from also firing.
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              {/* "Assign courier" while the delivery waits for a rider; "Open" always, so the
                  delivery can be opened from the keyboard too (the row click is mouse only). */}
              <div className="flex items-center gap-2">
                {isLookingForRider(d) ? <AssignCourierCell delivery={d} /> : null}
                <Button type="button" variant="outline" size="sm" onClick={() => goToDeliveryDetails(d.id)}>
                  Open
                </Button>
              </div>
            </div>
          )
        },
      },
    ],
    // goToDeliveryDetails is left out: the navigator builds a new one each render, which would
    // rebuild every column for nothing; the one it closes over always works.
    [courierNameById, now],
  )

  return (
    <DefaultLayout>
      {/* "Deliveries", not "Orders": the co-op's word for the thing a courier moves. */}
      <PageHeader title="Deliveries" />

      <DataTable
        columns={columns}
        data={getOrdersResponse.data?.data ?? []}
        serverPagination={true}
        pagination={pagination}
        onPaginationChange={setPagination}
        totalCount={getOrdersResponse.data?.pagination?.totalItems ?? 0}
        onRowClick={(order) => goToDeliveryDetails(order.id)}
      />
    </DefaultLayout>
  )
}

export default OrdersPage
