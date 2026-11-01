import { useGetCouriersQuery } from '@/api/couriersApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { usePageVisible } from '@/hooks/usePageVisible'
import { Button, DEFAULT_PAGE_SIZE, DataTable, StatusBadge } from '../../admin-web-components'
import type { CourierAdminDto } from '../../backend-admin-sdk'
import { courierName, deliverySettingLabel, memberSince } from '@/modules/couriers/courierDisplay'
import { CouriersListFilters, type CourierListStatus } from '@/modules/couriers/CouriersListFilters'
import { AddCourierDialog } from '@/modules/couriers/AddCourierDialog'
import { UserPlus } from '@phosphor-icons/react'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import type { NextPage } from 'next'
import { useMemo, useRef, useState } from 'react'

const CouriersPage: NextPage = () => {
  const { goToCourierDetails } = useAdminPageNavigator()
  // The Add courier dialog (spec 0013), and its button, which gets focus back on close.
  const [addOpen, setAddOpen] = useState(false)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  // Which riders to show and the search text, both sent to the backend (row 97).
  const [status, setStatus] = useState<CourierListStatus>('all')
  const [search, setSearch] = useState<string | undefined>(undefined)
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
    // goToCourierDetails is left out on purpose. That is safe here only because it calls Next's
    // router, whose push always reaches the one live router, so the first render's copy keeps
    // working. A function that read state or props could not be left out like this.
    [],
  )

  // Riders go Online and Offline on their own, so the list asks again every 30 s while the tab is
  // visible, as the deliveries list does (row 97 review); 0 while hidden: RTK Query does not poll at 0.
  const pageVisible = usePageVisible()
  const getCouriersResponse = useGetCouriersQuery(
    {
      status,
      search,
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
    },
    { pollingInterval: pageVisible ? 30_000 : 0 },
  )

  return (
    <DefaultLayout>
      <PageHeader
        title="Couriers"
        action={
          <Button ref={addButtonRef} type="button" onClick={() => setAddOpen(true)}>
            <UserPlus aria-hidden="true" className="mr-2 h-4 w-4" />
            Add courier
          </Button>
        }
      />
      {/* The co-op issues every rider's login here: there is no public sign up (spec 0013). */}
      <AddCourierDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        returnFocusTo={addButtonRef}
        onOpenCourier={(id) => goToCourierDetails(id)}
      />

      <CouriersListFilters
        status={status}
        onStatusChange={(next) => {
          // The tab already shown: nothing changes, so the page stays where it is.
          if (next === status) return
          setStatus(next)
          // A new tab starts again from the first page.
          setPagination({ pageSize: DEFAULT_PAGE_SIZE, pageIndex: 0 })
        }}
        onSearchChange={(next) => {
          setSearch(next)
          setPagination({ pageSize: DEFAULT_PAGE_SIZE, pageIndex: 0 })
        }}
      />

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
