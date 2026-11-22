import { useGetClosedSosQuery, useGetCurrentSosQuery } from '@/api/sosApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useFormat } from '@/i18n/useFormat'
import { riderName } from '@/modules/sos/sosAlerts'
import { closedByName, outcomeLabel, riderEnd, sosTime } from '@/modules/sos/sosDisplay'
import { SosStateBadge } from '@/modules/sos/SosStateBadge'
import { NextPageWithLayout } from '@/pages/_app'
import { Button, DEFAULT_PAGE_SIZE, DataTable } from '../../admin-web-components'
import type { SosIncidentAdminDto } from '../../backend-admin-sdk'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { ReactElement, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const openPath = (id: string) => `/sos/${encodeURIComponent(id)}`

// The columns both lists share (AC-9): the rider, when it started, how the rider ended it, the
// close, the outcome and the note. Never a count of a rider's incidents (decision 73.7).
function useColumns(): ColumnDef<SosIncidentAdminDto>[] {
  const router = useRouter()
  // useTranslation gives t, which looks a key up in the reader's language; useFormat gives times in it.
  const { t } = useTranslation()
  const f = useFormat()
  return useMemo(
    () => [
      {
        id: 'rider',
        header: t('sos.details.rider'),
        cell: ({ row }) => <span className="text-sm font-medium">{riderName(row.original)}</span>,
      },
      {
        id: 'state',
        header: t('sos.list.state'),
        cell: ({ row }) => <SosStateBadge state={row.original.state} />,
      },
      {
        id: 'started',
        header: t('sos.details.started'),
        cell: ({ row }) => <span className="text-sm">{sosTime(f, row.original.startedAt)}</span>,
      },
      {
        id: 'riderEnd',
        header: t('sos.list.riderEnd'),
        cell: ({ row }) => <span className="text-sm">{riderEnd(row.original, t, f) ?? t('common.dash')}</span>,
      },
      {
        id: 'closed',
        header: t('sos.details.closed'),
        cell: ({ row }) =>
          row.original.closedAt ? (
            <div className="flex flex-col text-sm">
              <span>{sosTime(f, row.original.closedAt)}</span>
              <span className="text-xs text-muted-foreground">{closedByName(row.original, t)}</span>
            </div>
          ) : (
            <span className="text-sm">{t('common.dash')}</span>
          ),
      },
      {
        id: 'outcome',
        header: t('sos.details.outcome'),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.outcome ? outcomeLabel(row.original.outcome, t) : t('common.dash')}
          </span>
        ),
      },
      {
        id: 'note',
        header: t('sos.details.note'),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs text-sm">{row.original.note ?? t('common.dash')}</span>
        ),
      },
      {
        id: 'action',
        header: () => <span className="sr-only">{t('sos.list.action')}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="outline" size="sm" onClick={() => void router.push(openPath(row.original.id))}>
              {t('common.open')}
            </Button>
          </div>
        ),
      },
    ],
    // router.push always reaches the one live router, so the first render's copy keeps working. `t` and
    // `f` change with the language, so the columns are built again then.
    [t, f],
  )
}

// Spec 0022 (AC-9): riders' SOS incidents. Active and awaiting close on top, all of them; then the
// closed ones, newest first, a page at a time.
const SosPage: NextPageWithLayout = () => {
  const { t } = useTranslation()
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
        description={t('sos.list.description')}
      />
      <section aria-labelledby="sos-current" className="mb-8 flex flex-col gap-3">
        <h2 id="sos-current" className="text-lg font-semibold">
          {t('sos.list.openNow')}
        </h2>
        {/* A failed ask is said in words, never shown as "No rider has an open SOS." (row 73 review). */}
        {current.isError && (
          <p
            role="status"
            className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm font-semibold text-destructive"
          >
            {t('sos.list.unreachable')}
          </p>
        )}
        {current.isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : current.isError && (current.data ?? []).length === 0 ? null : (current.data ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('sos.list.none')}
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
          {t('sos.list.closed')}
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
