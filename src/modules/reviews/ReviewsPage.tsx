import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  Button,
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
import type { ReviewRequestAdminDto, ReviewRequestStatus } from '@/backend-admin-sdk'
import { useGetInstanceConfigQuery } from '@/api/configApi'
import { useGetReviewRequestsQuery } from '@/api/reviewRequestApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { usePageVisible } from '@/hooks/usePageVisible'
import { athensDayTime } from '@/utils/athensMonth'
import { useFormat } from '@/i18n/useFormat'
import { AnswerReviewButton } from './AnswerReviewDialog'
import { REVIEW_TABS, dueText, outcomeText, topicText } from './reviewDisplay'

export const REVIEWS_PAGE_SIZE = 20
export const REVIEWS_POLL_MS = 30_000

// Spec 0038 (AC-5 to AC-7): riders' review requests. Open ones come first by due date, so the overdue
// ones lead; nothing answers a request on its own, so an overdue one stays here until a person does.
// Answered and withdrawn requests stay readable under their own tabs.
export function ReviewsPage() {
  const pageVisible = usePageVisible()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const [status, setStatus] = useState<ReviewRequestStatus>('OPEN')
  const [page, setPage] = useState(1)
  // `currentData`, not `data`: after a tab or page change, the last tab's rows (with their Answer
  // buttons) must not sit under the new tab's header while the new list loads.
  const { currentData: data, isError, isFetching } = useGetReviewRequestsQuery(
    { status, page, perPage: REVIEWS_PAGE_SIZE },
    // Riders send requests from their phones, which invalidates nothing here.
    { pollingInterval: pageVisible ? REVIEWS_POLL_MS : 0 }
  )
  const { data: settings } = useGetInstanceConfigQuery({})
  const correctionMaxCents = settings?.reviewCorrectionMaxCents ?? null
  const currencyCode = settings?.currency ?? 'EUR'

  const rows = data?.data ?? []
  const pagination = data?.pagination

  // Answering the last row of a later page leaves that page empty: go back to the last page that has rows.
  useEffect(() => {
    if (page > 1 && data && data.data.length === 0) {
      setPage(Math.max(1, Math.min(page - 1, data.pagination?.totalPages ?? 1)))
    }
  }, [data, page])

  const changeTab = (value: string) => {
    setStatus(value as ReviewRequestStatus)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reviews.title')}
        description={t('reviews.description')}
      />
      <Tabs value={status} onValueChange={changeTab}>
        <TabsList>
          {REVIEW_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t('reviews.list.loadFailed')}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isFetching && !data
            ? t('common.loading')
            : status === 'OPEN'
              ? t('reviews.list.noneOpen')
              : t('reviews.list.noneYet')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {status === 'OPEN'
                  ? t('reviews.list.due')
                  : status === 'ANSWERED'
                    ? t('reviews.list.answered')
                    : t('reviews.list.withdrawn')}
              </TableHead>
              <TableHead>{t('reviews.list.rider')}</TableHead>
              <TableHead>{t('reviews.list.about')}</TableHead>
              <TableHead>{t('reviews.list.delivery')}</TableHead>
              <TableHead className="w-2/5">
                {status === 'ANSWERED' ? t('reviews.list.requestAndAnswer') : t('reviews.list.request')}
              </TableHead>
              {status === 'OPEN' ? <TableHead className="sr-only">{t('reviews.list.answer')}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((request) => (
              <ReviewRow
                key={request.id}
                request={request}
                correctionMaxCents={correctionMaxCents}
                currencyCode={currencyCode}
              />
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
            {t('reviews.list.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('reviews.list.page', { current: pagination.currentPage, total: pagination.totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={!pagination.nextPage || isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            {t('reviews.list.next')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function ReviewRow({
  request,
  correctionMaxCents,
  currencyCode,
}: {
  request: ReviewRequestAdminDto
  correctionMaxCents: number | null
  currencyCode: string
}) {
  const { t } = useTranslation()
  // useFormat gives money in the reader's language.
  const f = useFormat()
  const when =
    request.status === 'OPEN'
      ? null
      : request.status === 'ANSWERED' && request.answeredAt
        ? athensDayTime(request.answeredAt)
        : request.withdrawnAt
          ? athensDayTime(request.withdrawnAt)
          : null

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap align-top">
        {request.status === 'OPEN' ? (
          <>
            <span className={request.overdue ? 'font-semibold text-destructive' : undefined}>
              {dueText(t, request.dueAt, request.overdue)}
            </span>
            <div className="text-xs text-muted-foreground">
              {t('reviews.list.dueAt', { when: athensDayTime(request.dueAt) })}
            </div>
          </>
        ) : (
          when
        )}
        <div className="text-xs text-muted-foreground">
          {t('reviews.list.sentAt', { when: athensDayTime(request.createdAt) })}
        </div>
      </TableCell>
      <TableCell className="align-top">{request.courierName}</TableCell>
      <TableCell className="align-top">{topicText(t, request.topic)}</TableCell>
      <TableCell className="align-top">
        {request.delivery ? (
          <Link
            href={{ pathname: EAdminRoutes.DELIVERY_DETAILS, query: { deliveryId: request.delivery.id } }}
            className="underline underline-offset-2"
          >
            {`${request.delivery.pickupName}, ${athensDayTime(request.delivery.createdAt)}`}
          </Link>
        ) : (
          <span className="text-muted-foreground">{t('reviews.list.general')}</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        <p className="whitespace-pre-wrap break-words text-sm">{request.note}</p>
        {request.status === 'ANSWERED' && request.outcome ? (
          <div className="mt-2 space-y-1 border-l-2 pl-3 text-sm">
            <p className="font-medium">{outcomeText(t, request.outcome)}</p>
            {request.answer ? <p className="whitespace-pre-wrap break-words">{request.answer}</p> : null}
            {request.correctionCents !== null ? (
              <p>
                {t('reviews.list.payCorrection', {
                  amount: f.money(request.correctionCents, request.correctionCurrency ?? currencyCode),
                })}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t('reviews.list.answeredBy', { name: request.answeredBy ?? t('reviews.list.removedAdmin') })}
            </p>
          </div>
        ) : null}
      </TableCell>
      {request.status === 'OPEN' ? (
        <TableCell className="text-right align-top">
          <AnswerReviewButton request={request} correctionMaxCents={correctionMaxCents} currencyCode={currencyCode} />
        </TableCell>
      ) : null}
    </TableRow>
  )
}
