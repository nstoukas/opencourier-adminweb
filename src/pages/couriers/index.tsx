import { useGetCouriersQuery } from '@/api/couriersApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { Button, DEFAULT_PAGE_SIZE, DataTable, StatusBadge } from '../../admin-web-components'
import type { CourierAdminDto } from '../../backend-admin-sdk'
import { courierName, deliverySettingLabel, memberSince } from '@/modules/couriers/courierDisplay'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import type { NextPage } from 'next'
import { useMemo, useState } from 'react'

const CouriersPage: NextPage = () => {
  const { goToCourierDetails } = useAdminPageNavigator()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  // The board's columns (spec 0012, AC-1). Nothing here rates, counts or tracks a rider (value 5):
  // no acceptance rate, no online time, no totals, no location, no vehicle (all mopeds).
  const columns: ColumnDef<CourierAdminDto>[] = useMemo(
    () => [
      {
        id: 'courier',
        header: 'Courier',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{courierName(row.original)}</span>
            <span className="text-xs text-muted-foreground">{row.original.phoneNumber ?? '—'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge kind="courier" status={row.original.status} />,
      },
      {
        id: 'offers',
        header: 'Offers',
        cell: ({ row }) => <span className="text-sm">{deliverySettingLabel(row.original.deliverySetting)}</span>,
      },
      {
        id: 'memberSince',
        header: 'Member since',
        cell: ({ row }) => <span className="text-sm">{memberSince(row.original.createdAt)}</span>,
      },
      {
        id: 'action',
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) => (
          // The row itself opens the courier; this keeps the click from firing twice.
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="outline" size="sm" onClick={() => goToCourierDetails(row.original.id)}>
              Open
            </Button>
          </div>
        ),
      },
    ],
    // goToCourierDetails is left out: the navigator builds a new one each render.
    [],
  )

  const getCouriersResponse = useGetCouriersQuery({
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
  })

  return (
    <DefaultLayout>
      <PageHeader title="Couriers" />

      <div>
        <DataTable
          columns={columns}
          data={getCouriersResponse.data?.data ?? []}
          serverPagination={true}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalCount={getCouriersResponse.data?.pagination?.totalItems ?? 0}
          onRowClick={(courier) => goToCourierDetails(courier.id)}
        />
      </div>
    </DefaultLayout>
  )
}

export default CouriersPage
