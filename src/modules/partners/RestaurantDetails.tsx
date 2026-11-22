import React, { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ListBullets, PencilSimple, Key, Warning } from '@phosphor-icons/react'
import { useGetPartnerQuery } from '@/api/partnersApi'
import { useGetDeliveriesQuery } from '@/api/deliveriesApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { usePageVisible } from '@/hooks/usePageVisible'
import {
  Alert,
  AlertDescription,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailList,
} from '@/admin-web-components'
import { useTranslation } from 'react-i18next'
import { useFormat } from '@/i18n/useFormat'
import { formatPickupAddressForDisplay } from '@/utils/partnerPickupAddress'
import type { DeliveryListState } from '@/modules/deliveries/components/DeliveriesListFilters'
import { DeliveryRow } from '@/modules/deliveries/components/DeliveryRow'
import { PartnerFormDialog } from './components/PartnerFormDialog'
import { RotateCredentialsDialog } from './components/RotateCredentialsDialog'
import { MessageButton, NO_LOGIN_REASON } from '@/modules/chat/MessageButton'
import { PartnerAvailabilityCard } from './components/PartnerAvailabilityCard'
import { PartnerWaitRecordCard } from './components/PartnerWaitRecordCard'
import { PartnerApiKeyCard } from './components/PartnerApiKeyCard'
import { PartnerUnbilledLine } from '@/modules/charges/PartnerUnbilledLine'
import { PartnerCustomersCard } from './components/PartnerCustomersCard'

// Leaflet needs `window`, so the map loads only in the browser.
const PickupPinMap = dynamic(() => import('./components/PickupPinMap'), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />,
})

// How many recent deliveries the page lists (spec 0024, AC-5).
const RECENT_DELIVERIES = 10

// Deliveries change in the courier app and the request app, which invalidate nothing here, so the
// page asks again every 30 s while it is visible, as the courier page does.
const REFRESH_MS = 30_000

// Typed, because `getDeliveries` takes `any`: a misspelt state would otherwise compile.
const ACTIVE: DeliveryListState = 'active'

// A restaurant's page (spec 0024): who it is, what it has going now, its pickup pin, its recent
// deliveries and its saved customers. Every figure is one the backend answers exactly: no client
// side counting, and no money per restaurant (the delivery fee is the customer's, not the store's).
export function RestaurantDetails({ partnerId }: { partnerId: string }) {
  const { goToPartners, goToDeliveryDetails } = useAdminPageNavigator()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // Dates in the reader's language, on Athens time.
  const f = useFormat()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false)
  // The Edit Details and Set New Password buttons, which get focus back when their dialog closes.
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const passwordButtonRef = useRef<HTMLButtonElement>(null)

  // 0 while the tab is in the background: RTK Query does not poll at 0.
  const pageVisible = usePageVisible()
  const pollingInterval = pageVisible ? REFRESH_MS : 0
  const partnerQuery = useGetPartnerQuery({ id: partnerId }, { skip: !partnerId, pollingInterval })
  // `currentData` is the answer for THIS id only, so going back between two restaurants never
  // shows the previous one's name while the next loads.
  const partner = partnerQuery.currentData
  // Both delivery queries wait for the restaurant, so a wrong id asks for nothing more.
  const liveQuery = useGetDeliveriesQuery(
    { partnerId, state: ACTIVE, page: 1, perPage: 1 },
    { skip: !partner, pollingInterval },
  )
  const recentQuery = useGetDeliveriesQuery(
    { partnerId, page: 1, perPage: RECENT_DELIVERIES },
    { skip: !partner, pollingInterval },
  )

  // The h1 is there in every state ("Restaurant" while loading or on an error). No id yet means
  // Next.js has not read the URL: still loading, not "not found" (row 91 review).
  if (!partnerId || partnerQuery.isLoading || (!partner && !partnerQuery.isError)) {
    return (
      <>
        <PageHeader title={t('partners.details.title')} />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </>
    )
  }
  if (!partner) {
    return (
      <>
        <PageHeader title={t('partners.details.title')} />
        <p className="text-sm text-muted-foreground">{t('partners.details.notFound')}</p>
      </>
    )
  }

  const pickup = partner.pickupAddress
  // The server's own count of the restaurant's deliveries that have not ended (AC-3).
  // `currentData`, as for the restaurant: only this restaurant's answer, never the previous one's.
  const liveCount = liveQuery.currentData?.pagination?.totalItems
  const recent = recentQuery.currentData?.data ?? []

  return (
    <>
      <Breadcrumb
        steps={[
          { label: t('partners.list.title'), href: '/partners', onClick: () => goToPartners() },
          { label: partner.name },
        ]}
      />
      <PageHeader
        title={partner.name}
        description={t('partners.details.memberSince', { date: f.monthYear(partner.createdAt) })}
        action={
          <>
            {/* Its whole order history, on the deliveries list filtered to it (spec 0017, AC-7).
                `asChild` makes the Button style the link instead of drawing its own <button>. */}
            <Button variant="outline" asChild>
              <Link href={{ pathname: '/deliveries', query: { partnerId: partner.id } }}>
                <ListBullets aria-hidden="true" className="mr-2 h-4 w-4" />
                {t('partners.details.seeOrders')}
              </Link>
            </Button>
            {/* Its chat thread with dispatch (spec 0034, AC-15). With no sign in it could never read a
                reply, so the button is off and says why. */}
            <MessageButton
              party={{ partnerId: partner.id }}
              name={partner.name}
              disabledReason={partner.userId ? undefined : NO_LOGIN_REASON}
            />
            <Button ref={passwordButtonRef} type="button" variant="outline" onClick={() => setRotateDialogOpen(true)}>
              <Key aria-hidden="true" className="mr-2 h-4 w-4" />
              {t('partners.details.setNewPassword')}
            </Button>
            <Button ref={editButtonRef} type="button" onClick={() => setEditDialogOpen(true)}>
              <PencilSimple aria-hidden="true" className="mr-2 h-4 w-4" />
              {t('partners.details.editDetails')}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <Card className="max-w-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('partners.details.liveNow')}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums" data-testid="live-now-count">
              {liveQuery.isError ? (
                <span className="text-base font-normal text-destructive">{t('partners.details.couldNotLoad')}</span>
              ) : liveCount === undefined ? (
                t('common.dash')
              ) : (
                liveCount
              )}
            </p>
          </CardContent>
        </Card>

        {/* What this restaurant still owes for this month, linking to its charges (spec 0036, AC-11). */}
        <PartnerUnbilledLine partnerId={partner.id} />

        {/* Busy mode, pause, disable, and who changed them (spec 0029). */}
        <PartnerAvailabilityCard partner={partner} />
        {/* How long riders wait, how often it runs late, and the real prep time (spec 0030). */}
        <PartnerWaitRecordCard partnerId={partner.id} partnerName={partner.name} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('partners.details.pickupAndContact')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pickup ? (
                <PickupPinMap latitude={pickup.latitude} longitude={pickup.longitude} />
              ) : (
                <Alert variant="warning">
                  <Warning aria-hidden="true" className="h-4 w-4" />
                  <AlertDescription>{t('partners.details.noPickupAlert')}</AlertDescription>
                </Alert>
              )}
              {/* DetailList shows an em dash for a missing value. */}
              <DetailList
                items={[
                  { label: t('partners.details.pickupAddress'), value: pickup ? formatPickupAddressForDisplay(pickup) : null },
                  { label: t('partners.details.pin'), value: pickup ? `${pickup.latitude}, ${pickup.longitude}` : null, mono: true },
                  { label: t('partners.details.phone'), value: partner.phoneNumber },
                  { label: t('partners.details.signInEmail'), value: partner.email, mono: true },
                  {
                    label: t('partners.details.statusUpdates'),
                    value: partner.webhookUrl || t('partners.details.noWebhook'),
                    mono: !!partner.webhookUrl,
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('partners.details.recentDeliveries')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {recentQuery.isLoading ? (
                <p className="text-muted-foreground">{t('common.loading')}</p>
              ) : recentQuery.isError ? (
                <p className="text-destructive">{t('partners.details.deliveriesFailed')}</p>
              ) : recent.length === 0 ? (
                <p className="text-muted-foreground">{t('partners.details.noDeliveries')}</p>
              ) : (
                <ul>
                  {recent.map((delivery) => (
                    <DeliveryRow
                      key={delivery.id}
                      delivery={delivery}
                      onOpen={goToDeliveryDetails}
                      // The restaurant is this page, so the line under the reference is the customer.
                      subtitle={delivery.dropoffName || t('common.dash')}
                      extra={
                        <span className="text-right text-xs text-muted-foreground tabular-nums">
                          {f.dateTime(delivery.createdAt)}
                        </span>
                      }
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* key: another restaurant's page starts the card afresh (Next keeps it mounted otherwise),
            so a search typed for one restaurant never carries over to the next. */}
        <PartnerCustomersCard key={partner.id} partnerId={partner.id} restaurantName={partner.name} />

        {/* Whether the restaurant has an API key and since when; an admin makes or removes it (spec 0037). */}
        {/* key: another restaurant's page starts the card afresh, so a key shown for one restaurant can
            never appear under the next one's name (Fable review, minor 3). Prefixed, since the customers
            card beside it already uses the bare id and React keys must differ between siblings. */}
        <PartnerApiKeyCard key={`api-key-${partner.id}`} partner={partner} />
      </div>

      <PartnerFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="update"
        partner={partner}
        returnFocusTo={editButtonRef}
      />
      <RotateCredentialsDialog
        key={`password-${partner.id}`}
        open={rotateDialogOpen}
        onOpenChange={setRotateDialogOpen}
        partnerId={partner.id}
        partnerName={partner.name}
        returnFocusTo={passwordButtonRef}
      />
    </>
  )
}
