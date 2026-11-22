import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/admin-web-components'
import type { ComplaintAbout, ComplaintAdminDto, ComplaintStatus } from '@/backend-admin-sdk'
import { useGetComplaintsQuery } from '@/api/complaintApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { usePageVisible } from '@/hooks/usePageVisible'
import { athensDayTime } from '@/utils/athensMonth'
import {
  COMPLAINT_ABOUT_FILTERS,
  COMPLAINT_STATUS_FILTERS,
  aboutText,
  categoryText,
  filerText,
  statusText,
} from './complaintDisplay'

export const COMPLAINTS_PAGE_SIZE = 20
export const COMPLAINTS_POLL_MS = 30_000

// Spec 0052 (AC-6, cross check 13): every complaint, newest first, one row each. The only filters are
// status and who it is about. Never grouped, counted or sorted by rider, and no rider filter or search:
// the backend's list takes no rider id (binding value 5). Each row opens the complaint's page.
export function ComplaintsPage() {
  const pageVisible = usePageVisible()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const [status, setStatus] = useState<ComplaintStatus | 'ALL'>('ALL')
  const [about, setAbout] = useState<ComplaintAbout | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  // `currentData`, not `data`: after a filter or page change, the last list's rows must not sit under
  // the new filter while the new list loads (as Reviews).
  const { currentData: data, isError, isFetching } = useGetComplaintsQuery(
    {
      status: status === 'ALL' ? undefined : status,
      about: about === 'ALL' ? undefined : about,
      page,
      perPage: COMPLAINTS_PAGE_SIZE,
    },
    // Riders and restaurants file from their own apps, which invalidates nothing here.
    { pollingInterval: pageVisible ? COMPLAINTS_POLL_MS : 0 }
  )

  const rows = data?.data ?? []
  const pagination = data?.pagination

  // Deciding the last row of a later page under a status filter leaves that page empty: step back.
  useEffect(() => {
    if (page > 1 && data && data.data.length === 0) {
      setPage(Math.max(1, Math.min(page - 1, data.pagination?.totalPages ?? 1)))
    }
  }, [data, page])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('complaints.title')}
        description={t('complaints.list.description')}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={status}
          onValueChange={(value) => {
            setStatus(value as ComplaintStatus | 'ALL')
            setPage(1)
          }}
        >
          <TabsList>
            {COMPLAINT_STATUS_FILTERS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {t(tab.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select
          value={about}
          onValueChange={(value) => {
            setAbout(value as ComplaintAbout | 'ALL')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48" aria-label={t('complaints.fields.about')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPLAINT_ABOUT_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t('complaints.aboutOption', { label: t(option.labelKey) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t('complaints.list.loadFailed')}
        </p>
      ) : null}

      {rows.length === 0 ? (
        // Row 83 review: "No complaint here." only when a list arrived; after a failed first load the
        // alert above stands alone, since the page never received an empty list.
        isError && !data ? null : (
          <p className="text-sm text-muted-foreground">{isFetching && !data ? t('common.loading') : t('complaints.list.empty')}</p>
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('complaints.fields.made')}</TableHead>
              <TableHead>{t('complaints.fields.from')}</TableHead>
              <TableHead>{t('complaints.fields.about')}</TableHead>
              <TableHead>{t('complaints.fields.what')}</TableHead>
              <TableHead>{t('complaints.fields.delivery')}</TableHead>
              <TableHead>{t('complaints.fields.status')}</TableHead>
              <TableHead className="sr-only">{t('complaints.fields.open')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((complaint) => (
              <ComplaintRow key={complaint.id} complaint={complaint} />
            ))}
          </TableBody>
        </Table>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!pagination.prevPage || isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {t('complaints.list.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('complaints.list.page', { current: pagination.currentPage, total: pagination.totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={!pagination.nextPage || isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            {t('complaints.list.next')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function ComplaintRow({ complaint }: { complaint: ComplaintAdminDto }) {
  const { t } = useTranslation()
  return (
    <TableRow data-testid="complaint-row">
      <TableCell className="whitespace-nowrap align-top">{athensDayTime(complaint.createdAt)}</TableCell>
      <TableCell className="align-top">{filerText(t, complaint)}</TableCell>
      <TableCell className="align-top">{aboutText(t, complaint)}</TableCell>
      <TableCell className="align-top">
        <p className="font-medium">{categoryText(t, complaint.category)}</p>
        <p className="line-clamp-2 whitespace-pre-wrap break-words text-muted-foreground">{complaint.text}</p>
      </TableCell>
      <TableCell className="align-top">
        <Link
          href={{ pathname: EAdminRoutes.DELIVERY_DETAILS, query: { deliveryId: complaint.delivery.id } }}
          className="underline underline-offset-2"
        >
          {`${complaint.delivery.pickupName}, ${athensDayTime(complaint.delivery.createdAt)}`}
        </Link>
      </TableCell>
      <TableCell className="align-top">{statusText(t, complaint.status)}</TableCell>
      <TableCell className="text-right align-top">
        <Button asChild size="sm" variant="outline">
          <Link href={{ pathname: EAdminRoutes.COMPLAINT_DETAILS, query: { complaintId: complaint.id } }}>{t('complaints.fields.open')}</Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}
