import { useGetCouriersQuery } from '@/api/couriersApi'
import { useGetDeliveriesQuery } from '@/api/deliveriesApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { useNow } from '@/hooks/useNow'
import { AssignCourierCell } from '@/modules/deliveries/components/AssignCourierCell'
import { OfferSummary } from '@/modules/deliveries/components/OfferSummary'
import { DeliveriesFilters, DeliveriesTableFilters } from '@/modules/deliveries/components/DeliveriesTableFilters'
import { DEFAULT_PAGE_SIZE, DataTable, StatusBadge } from '../../admin-web-components'
import { DeliveryAdminDto } from '../../backend-admin-sdk'
import { formatDate } from '../../ui-shared-utils'
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
  const [filters, setFilters] = useState<DeliveriesFilters>()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  // The Offer column changes on its own (an offer expires, moves to the next rider, a rider
  // comes free), so the list asks the backend again every 30 s; `pollingInterval` is RTK
  // Query's built in timer for that. `now` ages the minutes shown between two fetches.
  const getOrdersResponse = useGetDeliveriesQuery(
    {
      state: filters?.state,
      search: filters?.search,
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
    },
    { pollingInterval: OFFER_REFRESH_MS },
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

  const columns: ColumnDef<DeliveryAdminDto>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Delivery ID',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        // Spec 0002, AC-11: who holds the open offer and for how long, or how long nobody
        // has been free. Empty for a delivery that is not looking for a rider.
        id: 'offer',
        header: 'Offer',
        cell: ({ row }) => <OfferSummary delivery={row.original} now={now} />,
      },
      {
        id: 'courierId',
        header: 'Courier',
        cell: ({ row }) => {
          const d = row.original
          return (
            <div
              className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="min-w-0">
                {/* Only the rider who accepted. While the delivery is looking for a rider, the
                    Offer column already says who holds the offer, so this one shows a dash. */}
                {d.courierId ? (
                  <CourierResolvedName courierId={d.courierId} nameById={courierNameById} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <AssignCourierCell delivery={d} />
            </div>
          )
        },
      },
      // {
      //   header: 'Customer',
      //   accessorFn: ({ customer }) => (customer ? `${customer.firstName} ${customer.lastName}` : 'N/A'),
      // },
      // {
      //   header: 'Customer Phone',
      //   accessorFn: ({ customer }) => (customer && customer.cellPhone ? formatPhone(customer.cellPhone) : 'N/A'),
      // },
      {
        header: 'Created At',
        accessorFn: ({ createdAt }) => formatDate(createdAt),
      },
      // {
      //   header: 'Subtotal',
      //   accessorFn: ({ cost }) => (cost ? `$${formatPennies(cost.subtotalAmount)}` : 'N/A'),
      // },
    ],
    [courierNameById, now],
  )

  return (
    <DefaultLayout>
      <h2 className="text-3xl font-medium tracking-tight">Orders</h2>

      <DeliveriesTableFilters
        onFiltersChange={(newFilters) => {
          setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }))
          setPagination({ pageSize: DEFAULT_PAGE_SIZE, pageIndex: 0 })
        }}
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
