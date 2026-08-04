import { useGetCouriersQuery } from '@/api/couriersApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { CourierStatusBadge } from '@/modules/deliveries/components/CourierStatusBadge'
import { DEFAULT_PAGE_SIZE, DataTable } from '../../admin-web-components'
import type { CourierAdminDto } from '../../backend-admin-sdk'
import { EnumCourierStatus } from '../../shared-types'
import { formatDate } from '../../ui-shared-utils'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import type { NextPage } from 'next'
import { useState } from 'react'

function deliverySettingLabel(value: CourierAdminDto['deliverySetting']): string {
  const labels: Record<CourierAdminDto['deliverySetting'], string> = {
    AUTO_ACCEPT: 'Auto accept',
    AUTO_REJECT: 'Auto reject',
    MANUAL: 'Manual',
    NONE: 'None',
  }
  // `value` is whatever the API sent. A delivery setting added server-side is not a key this
  // build has a label for, so the lookup can miss; reading it through a string index is what
  // admits that, and the fallback shows the raw code rather than "undefined".
  const label = (labels as Partial<Record<string, string>>)[value]
  return label ?? value
}

const columns: ColumnDef<CourierAdminDto>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`.trim(),
  },
  {
    accessorKey: 'phoneNumber',
    header: 'Phone number',
    cell: ({ getValue }) => (getValue() as string | null) ?? '—',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <CourierStatusBadge status={row.original.status as EnumCourierStatus} />
    ),
  },
  {
    accessorKey: 'deliverySetting',
    header: 'Delivery setting',
    cell: ({ row }) => deliverySettingLabel(row.original.deliverySetting),
  },
  {
    id: 'joinedAt',
    header: 'Joined at',
    accessorFn: ({ createdAt }) => formatDate(createdAt),
  },
]

const CouriersPage: NextPage = () => {
  const { goToCourierDetails } = useAdminPageNavigator()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const getCouriersResponse = useGetCouriersQuery({
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
  })

  return (
    <DefaultLayout>
      <h2 className="text-3xl font-medium tracking-tight">Couriers</h2>

      <div className="mt-6">
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
