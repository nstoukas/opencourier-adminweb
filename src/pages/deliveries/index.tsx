import { useGetCouriersQuery } from '@/api/couriersApi'
import { useGetDeliveriesQuery } from '@/api/deliveriesApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { useNow } from '@/hooks/useNow'
import { usePageVisible } from '@/hooks/usePageVisible'
import { AssignCourierCell } from '@/modules/deliveries/components/AssignCourierCell'
import { DispatchPanel } from '@/modules/dispatch-stop/DispatchPanel'
import {
  DeliveriesListFilters,
  type DeliveryListState,
} from '@/modules/deliveries/components/DeliveriesListFilters'
import { deliveryOffer, isLookingForRider } from '@/modules/deliveries/utils/offer'
import { OfferSummary } from '@/modules/deliveries/components/OfferSummary'
import { Button, DEFAULT_PAGE_SIZE, DataTable, StatusBadge } from '../../admin-web-components'
import { DeliveryAdminDto } from '../../backend-admin-sdk'
import { formatMoney } from '@/utils/formatMoney'
import { shortId } from '@/utils/shortId'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import type { NextPage } from 'next'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useGetPartnersQuery } from '@/api/partnersApi'

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
  // Which deliveries to show and the search text, both sent to the backend (row 96).
  const [listState, setListState] = useState<DeliveryListState>('all')
  const [search, setSearch] = useState<string | undefined>(undefined)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  // One restaurant's whole history (spec 0017, AC-7), the only filter kept in the URL (?partnerId=), so a
  // restaurant's page can link here. The list follows the URL (a link, Back, or the Deliveries link in the
  // menu, which drops it); the select writes the URL without a reload. The list waits for the router to
  // know the query, so a link never flashes the unfiltered list first.
  // The URL is the one place the filter lives, so the list never asks without it first.
  const router = useRouter()
  const partnerId = typeof router.query.partnerId === 'string' ? router.query.partnerId : ''
  // Another restaurant (from the select, a link or Back) starts again from the first page.
  useEffect(() => {
    setPagination({ pageSize: DEFAULT_PAGE_SIZE, pageIndex: 0 })
  }, [partnerId])
  const changePartner = (next: string) => {
    const query = { ...router.query }
    if (next) query.partnerId = next
    else delete query.partnerId
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
  }
  const { data: partnersPayload } = useGetPartnersQuery({ page: 1, perPage: 500 })
  const restaurants = useMemo(
    () =>
      (partnersPayload?.data ?? [])
        .map((partner) => ({ id: partner.id, name: partner.name || partner.id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [partnersPayload?.data],
  )

  // The Offer column changes on its own (an offer expires, moves to the next rider, a rider
  // comes free), so the list asks the backend again every 30 s; `pollingInterval` is RTK
  // Query's built in timer for that. `now` ages the minutes shown between two fetches.
  const pageVisible = usePageVisible()
  const getOrdersResponse = useGetDeliveriesQuery(
    {
      state: listState,
      search,
      partnerId: partnerId || undefined,
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
    },
    // 0 while the tab is in the background: RTK Query does not poll at 0. `skip` until the URL is read.
    { pollingInterval: pageVisible ? OFFER_REFRESH_MS : 0, skip: !router.isReady },
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

  // The board's columns (spec 0011, AC-1).
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

      {/* Stop dispatch for heat or a storm, and see when it restarts (spec 0014). */}
      <DispatchPanel />

      <DeliveriesListFilters
        state={listState}
        onStateChange={(next) => {
          setListState(next)
          // A new filter starts again from the first page.
          setPagination({ pageSize: DEFAULT_PAGE_SIZE, pageIndex: 0 })
        }}
        onSearchChange={(next) => {
          setSearch(next)
          setPagination({ pageSize: DEFAULT_PAGE_SIZE, pageIndex: 0 })
        }}
        partnerId={partnerId}
        restaurants={restaurants}
        onPartnerChange={changePartner}
      />

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
