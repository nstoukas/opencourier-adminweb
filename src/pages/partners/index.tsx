import React, { useMemo, useRef, useState } from 'react'
import type { NextPage } from 'next'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { useGetPartnersQuery } from '@/api/partnersApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { Button, DEFAULT_PAGE_SIZE, DataTable } from '@/admin-web-components'
import type { PartnerAdminDto } from '@/backend-admin-sdk'
import { formatPickupAddressForDisplay } from '@/utils/partnerPickupAddress'
import { useFormat } from '@/i18n/useFormat'
import { PartnerFormDialog } from '@/modules/partners/components/PartnerFormDialog'
import { RestaurantSearch } from '@/modules/partners/RestaurantSearch'
import { Plus } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

// The restaurants list (spec 0024, AC-1), with the board's search (row 106). Only what the backend
// sends today: no live or today figures (they need the backend first, see the deferred list).
const PartnersPage: NextPage = () => {
  const { goToPartnerDetails } = useAdminPageNavigator()
  // useTranslation gives t, which looks a key up in the reader's language (src/i18n/resources).
  const { t } = useTranslation()
  // The date formats in the reader's language, on Athens time (src/i18n/useFormat.ts).
  const f = useFormat()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  // The Add Restaurant button, which gets focus back when the dialog closes.
  const addButtonRef = useRef<HTMLButtonElement>(null)
  // The search text, sent to the backend (row 106).
  const [search, setSearch] = useState<string | undefined>(undefined)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const columns: ColumnDef<PartnerAdminDto>[] = useMemo(
    () => [
      {
        id: 'restaurant',
        header: t('partners.list.columns.restaurant'),
        cell: ({ row }) => {
          const address = row.original.pickupAddress ? formatPickupAddressForDisplay(row.original.pickupAddress) : null
          return (
            <div className="flex min-w-0 max-w-xs flex-col">
              <span className="text-sm font-medium">{row.original.name}</span>
              {address ? (
                // One line; the full address is in the tooltip when it is cut.
                <span className="truncate text-xs text-muted-foreground" title={address}>
                  {address}
                </span>
              ) : (
                // A restaurant with no pickup address cannot send a delivery, so it stands out.
                <span className="text-xs font-medium text-warning-foreground">{t('partners.list.noPickupAddress')}</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'phoneNumber',
        header: t('partners.list.columns.phone'),
        cell: ({ row }) => <span className="text-sm">{row.original.phoneNumber ?? '—'}</span>,
      },
      {
        accessorKey: 'email',
        header: t('partners.list.columns.signInEmail'),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.email ?? '—'}</span>,
      },
      {
        id: 'memberSince',
        header: t('partners.list.columns.memberSince'),
        // The SDK builds createdAt with `new Date(...)`, so it is always a Date here.
        cell: ({ row }) => <span className="text-sm">{f.monthYear(row.original.createdAt)}</span>,
      },
      {
        id: 'action',
        header: () => <span className="sr-only">{t('partners.list.columns.action')}</span>,
        cell: ({ row }) => (
          // The row itself opens the restaurant; this keeps the click from firing twice.
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="outline" size="sm" onClick={() => goToPartnerDetails(row.original.id)}>
              {t('common.open')}
            </Button>
          </div>
        ),
      },
    ],
    // goToPartnerDetails is left out on purpose: it calls Next's router, whose push always reaches
    // the one live router, so the first render's copy keeps working (as on the couriers list).
    // t and f change when the language does, so the headers and dates follow a switch.
    [t, f],
  )

  const getPartnersResponse = useGetPartnersQuery({
    search,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
  })

  return (
    <DefaultLayout>
      <PageHeader
        title={t('partners.list.title')}
        action={
          <Button ref={addButtonRef} type="button" onClick={() => setCreateDialogOpen(true)}>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            {t('partners.list.addRestaurant')}
          </Button>
        }
      />

      <RestaurantSearch
        onSearchChange={(next) => {
          setSearch(next)
          // A new search starts again from the first page.
          setPagination({ pageSize: DEFAULT_PAGE_SIZE, pageIndex: 0 })
        }}
      />

      <div>
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
        returnFocusTo={addButtonRef}
      />
    </DefaultLayout>
  )
}

export default PartnersPage
