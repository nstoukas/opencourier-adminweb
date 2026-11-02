import { useGetClosedSosQuery, useGetCurrentSosQuery } from '@/api/sosApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { athensDateTime } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { riderName } from '@/modules/sos/sosAlerts'
import { SOS_OUTCOME_LABELS, closedByName, riderEnd } from '@/modules/sos/sosDisplay'
import { SosStateBadge } from '@/modules/sos/SosStateBadge'
import { NextPageWithLayout } from '@/pages/_app'
import { Button, DEFAULT_PAGE_SIZE, DataTable } from '../../admin-web-components'
import type { SosIncidentAdminDto } from '../../backend-admin-sdk'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { ReactElement, useMemo, useState } from 'react'

const openPath = (id: string) => `/sos/${encodeURIComponent(id)}`

// The columns both lists share (AC-9): the rider, when it started, how the rider ended it, the
// close, the outcome and the note. Never a count of a rider's incidents (decision 73.7).
function useColumns(): ColumnDef<SosIncidentAdminDto>[] {
  const router = useRouter()
  return useMemo(
    () => [
      {
        id: 'rider',
        header: 'Rider',
        cell: ({ row }) => <span className="text-sm font-medium">{riderName(row.original)}</span>,
      },
      {
        id: 'state',
        header: 'State',
        cell: ({ row }) => <SosStateBadge state={row.original.state} />,
      },
      {
        id: 'started',
        header: 'Started',
        cell: ({ row }) => <span className="text-sm">{athensDateTime(row.original.startedAt)}</span>,
      },
      {
        id: 'riderEnd',
        header: 'Safe or false alarm',
        cell: ({ row }) => <span className="text-sm">{riderEnd(row.original) ?? '—'}</span>,
      },
      {
        id: 'closed',
        header: 'Closed',
        cell: ({ row }) =>
          row.original.closedAt ? (
            <div className="flex flex-col text-sm">
              <span>{athensDateTime(row.original.closedAt)}</span>
              <span className="text-xs text-muted-foreground">{closedByName(row.original)}</span>
            </div>
          ) : (
            <span className="text-sm">—</span>
          ),
      },
      {
        id: 'outcome',
        header: 'Outcome',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.outcome ? SOS_OUTCOME_LABELS[row.original.outcome] : '—'}</span>
        ),
      },
      {
        id: 'note',
        header: 'Note',
        cell: ({ row }) => <span className="line-clamp-2 max-w-xs text-sm">{row.original.note ?? '—'}</span>,
      },
      {
        id: 'action',
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="outline" size="sm" onClick={() => void router.push(openPath(row.original.id))}>
              Open
            </Button>
          </div>
        ),
      },
    ],
    // router.push always reaches the one live router, so the first render's copy keeps working.
    [],
  )
}

// Spec 0022 (AC-9): riders' SOS incidents. Active and awaiting close on top, all of them; then the
// closed ones, newest first, a page at a time.
const SosPage: NextPageWithLayout = () => {
  const router = useRouter()
  const columns = useColumns()
  // The same query the banner polls every 10 s, so this list stays as fresh as the banner.
  const current = useGetCurrentSosQuery()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })
  const closed = useGetClosedSosQuery({ page: pagination.pageIndex + 1, limit: pagination.pageSize })

  return (
    <>
      <PageHeader
        title="SOS"
        description="A rider's position is shared only while their SOS is active, and deleted after the period set on Settings."
      />
      <section aria-labelledby="sos-current" className="mb-8 flex flex-col gap-3">
        <h2 id="sos-current" className="text-lg font-semibold">
          Open now
        </h2>
        {current.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (current.data ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No rider has an open SOS.
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={current.data ?? []}
            // Every open SOS on one page: never more than a few at once.
            pageSize={100}
            onRowClick={(incident) => void router.push(openPath(incident.id))}
          />
        )}
      </section>
      <section aria-labelledby="sos-closed" className="flex flex-col gap-3">
        <h2 id="sos-closed" className="text-lg font-semibold">
          Closed
        </h2>
        <DataTable
          columns={columns}
          data={closed.data?.data ?? []}
          serverPagination={true}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalCount={closed.data?.pagination.totalItems ?? 0}
          onRowClick={(incident) => void router.push(openPath(incident.id))}
        />
      </section>
    </>
  )
}

// getLayout wraps the page in the sidebar layout once, so it stays mounted between pages.
SosPage.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default SosPage
