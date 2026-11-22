import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetCourierQuery } from '@/api/couriersApi'
import { useGetDeliveriesQuery } from '@/api/deliveriesApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { usePageVisible } from '@/hooks/usePageVisible'
import { useFormat } from '@/i18n/useFormat'
import { Key, PhoneCall } from '@phosphor-icons/react'
import { Breadcrumb, Button, Card, CardContent, CardHeader, CardTitle, DetailList, StatusBadge } from '@/admin-web-components'
import { DeliveryRow } from '@/modules/deliveries/components/DeliveryRow'
import { courierName, deliverySettingLabel } from './courierDisplay'
import { RotateCourierPasswordDialog } from './RotateCourierPasswordDialog'
import { MessageButton } from '@/modules/chat/MessageButton'
import { CourierTimeWorkedCard } from '@/modules/time-worked/CourierTimeWorkedCard'
import { CourierAccountCard } from './CourierAccountCard'
import { CourierStatementsCard } from './CourierStatementsCard'

// How many deliveries each card asks for (spec 0012). A rider carries one or two at a time.
const DELIVERIES_PER_CARD = 10

// A rider's progress is made in the courier app and reaches this page only if the page asks
// again, so it asks every 30 s, as the deliveries list and a delivery's page do (row 89 review).
const REFRESH_MS = 30_000

// A rider's page (spec 0012): who they are, what they carry now, their recent deliveries.
// Nothing here rates, counts or watches a rider (value 5): no acceptance rate, no totals, no location.
// The one exception is the Time worked card (spec 0040, decisions 36.3 and 36.8): the same figures the
// rider sees, shown to answer their questions and review requests, never compared with another rider.
export function CourierDetails({ courierId }: { courierId: string }) {
  // useTranslation gives t, which looks a key up in the reader's language; useFormat gives dates and
  // money in that language.
  const { t } = useTranslation()
  const f = useFormat()
  const { goToCouriers, goToDeliveryDetails } = useAdminPageNavigator()
  // The Change password dialog (spec 0013), and its button, which gets focus back on close.
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const passwordButtonRef = useRef<HTMLButtonElement>(null)
  // 0 while the tab is in the background: RTK Query does not poll at 0.
  const pageVisible = usePageVisible()
  const pollingInterval = pageVisible ? REFRESH_MS : 0
  const courierQuery = useGetCourierQuery({ id: courierId }, { skip: !courierId, pollingInterval })
  // `currentData` is the answer for THIS id only (`data` would keep the previous rider's record
  // while the next one loads, so going back between two riders would flash the wrong name).
  const courier = courierQuery.currentData
  // The two delivery lists wait for the courier, so a wrong id asks for nothing more.
  const nowQuery = useGetDeliveriesQuery(
    { courierId, state: 'active', page: 1, perPage: DELIVERIES_PER_CARD },
    { skip: !courier, pollingInterval }
  )
  const recentQuery = useGetDeliveriesQuery(
    { courierId, page: 1, perPage: DELIVERIES_PER_CARD },
    { skip: !courier, pollingInterval }
  )

  // The h1 is there in every state ("Courier" while loading or on an error).
  if (courierQuery.isLoading || (!courier && !courierQuery.isError && courierId)) {
    return (
      <>
        <PageHeader title={t('couriers.fallbackName')} />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </>
    )
  }
  if (!courier) {
    return (
      <>
        <PageHeader title={t('couriers.fallbackName')} />
        <p className="text-sm text-muted-foreground">{t('couriers.details.notFound')}</p>
      </>
    )
  }

  const name = courierName(courier, t)
  const firstName = courier.firstName.trim()

  return (
    <>
      <Breadcrumb
        steps={[
          {
            label: t('couriers.list.title'),
            href: '/couriers',
            onClick: () => goToCouriers(),
          },
          { label: name },
        ]}
      />
      <PageHeader
        title={name}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Their chat thread with dispatch (spec 0034, AC-15). */}
            <MessageButton party={{ courierId: courier.id }} name={name} />
            <Button ref={passwordButtonRef} type="button" variant="outline" onClick={() => setPasswordDialogOpen(true)}>
              <Key aria-hidden="true" className="mr-2 h-4 w-4" />
              {t('couriers.rotate.title')}
            </Button>
            {courier.phoneNumber ? (
              // A plain link styled as the design system's default button: the phone dials it.
              <a
                href={`tel:${courier.phoneNumber}`}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PhoneCall aria-hidden="true" className="h-4 w-4" />
                {firstName ? t('couriers.details.callNamed', { name: firstName }) : t('couriers.details.call')}
              </a>
            ) : null}
          </div>
        }
      />
      <RotateCourierPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        courierId={courier.id}
        firstName={firstName}
        carryingDelivery={(nowQuery.data?.data ?? []).length > 0}
        returnFocusTo={passwordButtonRef}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <StatusBadge kind="courier" status={courier.status} />
        <span>{courier.phoneNumber ?? t('couriers.details.noPhone')}</span>
        <span>{t('couriers.details.memberSince', { date: f.monthYear(courier.createdAt) })}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('couriers.details.rightNow')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {nowQuery.isLoading ? (
                <p className="text-muted-foreground">{t('common.loading')}</p>
              ) : nowQuery.isError ? (
                <p className="text-destructive">{t('couriers.details.loadDeliveriesFailed')}</p>
              ) : (nowQuery.data?.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">{t('couriers.details.notCarrying')}</p>
              ) : (
                <ul>
                  {(nowQuery.data?.data ?? []).map((delivery) => (
                    <DeliveryRow key={delivery.id} delivery={delivery} onOpen={goToDeliveryDetails} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('couriers.details.recent')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {recentQuery.isLoading ? (
                <p className="text-muted-foreground">{t('common.loading')}</p>
              ) : recentQuery.isError ? (
                <p className="text-destructive">{t('couriers.details.loadDeliveriesFailed')}</p>
              ) : (recentQuery.data?.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">{t('couriers.details.noDeliveries')}</p>
              ) : (
                <ul>
                  {(recentQuery.data?.data ?? []).map((delivery) => (
                    <DeliveryRow
                      key={delivery.id}
                      delivery={delivery}
                      onOpen={goToDeliveryDetails}
                      extra={
                        <span className="text-right text-xs text-muted-foreground">
                          {f.dateTime(delivery.createdAt)}
                          <span className="block font-medium tabular-nums text-foreground">
                            {f.money(delivery.totalCompensation, delivery.currencyCode)}
                          </span>
                        </span>
                      }
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('couriers.details.setup')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <DetailList
                items={[
                  {
                    label: t('couriers.field.deliverySetting'),
                    value: deliverySettingLabel(courier.deliverySetting, t),
                  },
                ]}
              />
            </CardContent>
          </Card>
          {/* Spec 0051 (AC-6): deactivate or reactivate, edit every detail, and the account history. */}
          <CourierAccountCard courier={courier} name={name} />
          {/* Spec 0050 (AC-9): the rider's monthly statements, each download recorded. */}
          <CourierStatementsCard courierId={courier.id} />
        </div>
      </div>
      <div className="mt-6">
        <CourierTimeWorkedCard courierId={courierId} pollingInterval={pollingInterval} />
      </div>
    </>
  )
}
