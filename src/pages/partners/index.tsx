import React, { useState } from 'react'
import type { NextPage } from 'next'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { useGetPartnersQuery } from '@/api/partnersApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { Button, DEFAULT_PAGE_SIZE, DataTable } from '@/admin-web-components'
import type { PartnerAdminDto } from '@/backend-admin-sdk'
import { formatPickupAddressForDisplay } from '@/utils/partnerPickupAddress'
import { formatDate } from '@/ui-shared-utils'
import { PartnerFormDialog } from '@/modules/partners/components/PartnerFormDialog'
import { Plus } from 'lucide-react'

const columns: ColumnDef<PartnerAdminDto>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'email',
    header: 'Login email',
    cell: ({ row }) => row.original.email ?? '—',
  },
  {
    accessorKey: 'phoneNumber',
    header: 'Phone',
    cell: ({ row }) => row.original.phoneNumber ?? '—',
  },
  {
    id: 'pickupAddress',
    header: 'Pickup address',
    accessorFn: (row) => formatPickupAddressForDisplay(row.pickupAddress),
  },
  {
    id: 'createdAt',
    header: 'Created',
    accessorFn: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
  },
]

// List page for managing registered restaurants (Partners).
const PartnersPage: NextPage = () => {
  const { goToPartnerDetails } = useAdminPageNavigator()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const getPartnersResponse = useGetPartnersQuery({
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
  })

  return (
    <DefaultLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-medium tracking-tight">Restaurants</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New restaurant
        </Button>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={getPartnersResponse.data?.data ?? []}
          serverPagination={true}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalCount={getPartnersResponse.data?.pagination?.totalItems ?? 0}
          onRowClick={(partner) => goToPartnerDetails(partner.id)}
        />
      </div>

      <PartnerFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
      />
    </DefaultLayout>
  )
}

export default PartnersPage
