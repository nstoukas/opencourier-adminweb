import React, { useEffect, useState } from 'react'
import Link from 'next/link'
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
        title="Complaints"
        description="Complaints from riders about restaurants and customers, and from restaurants or callers about riders. A person decides each one; a complaint about a rider waits for the rider's reply first."
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
                {tab.label}
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
          <SelectTrigger className="w-48" aria-label="About">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPLAINT_ABOUT_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                About: {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          The complaints could not be loaded. The list below may be out of date.
        </p>
      ) : null}

      {rows.length === 0 ? (
        // Row 83 review: "No complaint here." only when a list arrived; after a failed first load the
        // alert above stands alone, since the page never received an empty list.
        isError && !data ? null : (
          <p className="text-sm text-muted-foreground">{isFetching && !data ? 'Loading…' : 'No complaint here.'}</p>
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Made</TableHead>
              <TableHead>From</TableHead>
              <TableHead>About</TableHead>
              <TableHead>What</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="sr-only">Open</TableHead>
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
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={!pagination.nextPage || isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function ComplaintRow({ complaint }: { complaint: ComplaintAdminDto }) {
  return (
    <TableRow data-testid="complaint-row">
      <TableCell className="whitespace-nowrap align-top">{athensDayTime(complaint.createdAt)}</TableCell>
      <TableCell className="align-top">{filerText(complaint)}</TableCell>
      <TableCell className="align-top">{aboutText(complaint)}</TableCell>
      <TableCell className="align-top">
        <p className="font-medium">{categoryText(complaint.category)}</p>
        <p className="line-clamp-2 whitespace-pre-wrap break-words text-muted-foreground">{complaint.text}</p>
      </TableCell>
      <TableCell className="align-top">
        <Link
          href={{ pathname: EAdminRoutes.DELIVERY_DETAILS, query: { deliveryId: complaint.delivery.id } }}
          className="underline underline-offset-2"
        >
          {complaint.delivery.pickupName}, {athensDayTime(complaint.delivery.createdAt)}
        </Link>
      </TableCell>
      <TableCell className="align-top">{statusText(complaint.status)}</TableCell>
      <TableCell className="text-right align-top">
        <Button asChild size="sm" variant="outline">
          <Link href={{ pathname: EAdminRoutes.COMPLAINT_DETAILS, query: { complaintId: complaint.id } }}>Open</Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}
