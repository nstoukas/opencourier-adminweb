import React from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { boxSizeText } from '@/utils/boxSize'
import { legText } from '@/utils/legs'
import { StackedOrderCard } from '@/modules/deliveries/components/StackedOrderCard'
import { OrderLegsCard } from '@/modules/deliveries/components/OrderLegsCard'
import { OfferReasonsCard } from '@/modules/deliveries/components/OfferReasonsCard'
import { useGetDeliveryQuery, useSubmitDeliveryEventMutation } from '@/api/deliveriesApi'
import { useGetAllCouriersQuery } from '@/api/couriersApi'
import { useNow } from '@/hooks/useNow'
import { usePageVisible } from '@/hooks/usePageVisible'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { AssignCourierCell } from '@/modules/deliveries/components/AssignCourierCell'
import { ReassignCourierDialog } from '@/modules/deliveries/components/ReassignCourierDialog'
import { CancelDeliveryDialog } from '@/modules/deliveries/components/CancelDeliveryDialog'
import { CancellationCard } from '@/modules/deliveries/components/CancellationCard'
import { WaitChargesCard } from '@/modules/deliveries/components/WaitChargesCard'
import { DeliveryEventTimeline } from '@/modules/deliveries/components/DeliveryEventTimeline'
import { DeliveryIssues } from '@/modules/deliveries/components/DeliveryIssues'
import { DeliveryRemovalRequests } from '@/modules/deliveries/components/DeliveryRemovalRequests'
import { ProductReportsCard } from '@/modules/product-reports/ProductReportsCard'
import { FileComplaintCard } from '@/modules/complaints/FileComplaintCard'
import { OfferSummary } from '@/modules/deliveries/components/OfferSummary'
import { deliveryOffer, isLookingForRider, minutesWaiting, riderNameText } from '@/modules/deliveries/utils/offer'
import { optionalDateTime } from '@/modules/deliveries/utils/optionalDate'
import { useFormat } from '@/i18n/useFormat'
import { useServerText } from '@/i18n/useServerText'
import { eventTypeLabel } from '@/utils/deliveryEventDisplay'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Breadcrumb,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailList,
  type DetailListItem,
  Menu,
  MenuItem,
  MenuItems,
  MenuTrigger,
  StatusBadge,
  useToast,
} from '../../../admin-web-components'
import type { DeliveryAdminDto } from '../../../backend-admin-sdk'
import { EnumDeliveryEventType } from '../../../shared-types'
import { adminEventsForStatus, courierIdForAdminEvent } from '@/modules/deliveries/utils/adminEvents'
import { shortId } from '@/utils/shortId'
import { PageHeader } from '@/components/layouts/PageHeader'

// The server's 3 s grace plus one 30 s refresh of this page.
const OVERDUE_GRACE_MS = 33_000

function displayText(value: string | object | null | undefined): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function OrderItemsSection({ items }: { items: DeliveryAdminDto['orderItems'] }) {
  // useTranslation gives t, which looks a key up in the reader's language. Called before the early
  // return: React needs the same hooks in the same order on every render.
  const { t } = useTranslation()
  if (!items?.length) return null
  return (
    <div className="space-y-2 border-t pt-6">
      <h3 className="text-sm font-medium">{t('deliveries.details.orderItems')}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((item, i) => {
          const row = item as Record<string, unknown>
          const name = typeof row.name === 'string' ? row.name : t('deliveries.details.item', { number: i + 1 })
          const qty = typeof row.quantity === 'number' ? row.quantity : null
          const size = typeof row.size === 'string' ? row.size : null
          return (
            <li key={i}>
              {name}
              {qty != null ? ` × ${qty}` : ''}
              {size ? ` (${size})` : ''}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// How this delivery's price and the rider's pay were built (spec 0001), so members can audit
// it without reading the database. The base and distance fees come from the delivery's quote;
// the rest is written when the delivery is first offered to a rider. The last line is what the
// customer pays: delivery is charged to the customer, never billed through the restaurant.
function PriceBreakdownCard({ delivery }: { delivery: DeliveryAdminDto }) {
  const { t } = useTranslation()
  // Money in the reader's language (spec 0054, AC-3).
  const f = useFormat()
  const money = (amount: number | null | undefined) => f.money(amount, delivery.currencyCode)
  const feeLabel =
    delivery.feePercentage != null
      ? t('deliveries.price.coopFeePercent', { percent: f.number(delivery.feePercentage) })
      : t('deliveries.price.coopFee')
  const notOfferedYet = delivery.totalCompensation == null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('deliveries.price.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DetailList
          items={[
            { label: t('deliveries.price.baseFee'), value: money(delivery.baseFee) },
            { label: t('deliveries.price.distanceFee'), value: money(delivery.distanceFee) },
            { label: t('deliveries.price.riderGets'), value: money(delivery.totalCompensation) },
            { label: feeLabel, value: money(delivery.fee) },
            { label: t('deliveries.price.customerPays'), value: money(delivery.totalCost) },
            { label: t('deliveries.price.currency'), value: delivery.currencyCode },
          ]}
        />
        {notOfferedYet ? (
          <p className="text-muted-foreground">{t('deliveries.price.notOfferedYet')}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

// The open offer in detail (spec 0002, AC-11): who holds it, when it went out and when it ends,
// or since when nobody has been free. Times carry seconds, because an offer may last only 20.
// Shown only while the delivery is looking for a rider; it names the rider of this one offer,
// never a history or a count (value 5).
function OfferCard({ delivery, now }: { delivery: DeliveryAdminDto; now: Date }) {
  const { t } = useTranslation()
  // Times with seconds, on Athens time (spec 0054, AC-3).
  const f = useFormat()
  const offer = deliveryOffer(delivery)
  if (!offer) return null

  // A deadline already behind `now` while the offer is still open means the expiry did not run
  // (a failed job, a wiped queue): say so, rather than "ends" at a time that has passed.
  // Only after OVERDUE_GRACE_MS, though: the server ends an offer up to 3 s after its deadline and
  // this page refreshes every 30 s, so an offer that ended on time can still look open briefly.
  const overdue =
    delivery.offerExpiresAt != null && delivery.offerExpiresAt.getTime() + OVERDUE_GRACE_MS < now.getTime()

  const items =
    offer.kind === 'offered'
      ? [
          { label: t('deliveries.offerCard.offeredTo'), value: riderNameText(offer.riderName, t) },
          {
            label: t('deliveries.offerCard.offeredAt'),
            value: offer.since
              ? t('deliveries.offerCard.timeAgo', {
                  time: f.timeSeconds(offer.since),
                  ago: minutesWaiting(offer.since, now, t),
                })
              : null,
          },
          {
            label: overdue ? t('deliveries.offerCard.overdueSince') : t('deliveries.offerCard.offerEnds'),
            value: delivery.offerExpiresAt
              ? f.timeSeconds(delivery.offerExpiresAt)
              : t('deliveries.offerCard.notOnItsOwn'),
          },
        ]
      : [
          { label: t('deliveries.offerCard.noRiderFreeSince'), value: f.timeSeconds(offer.since) },
          { label: t('deliveries.offerCard.waiting'), value: minutesWaiting(offer.since, now, t) },
        ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('deliveries.offerCard.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList items={items} />
      </CardContent>
    </Card>
  )
}

type DeliveryDetailsProps = {
  deliveryId: string
}

// A card holding one DetailList, used for the facts on the right of the page.
function FactsCard({ title, items }: { title: string; items: DetailListItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <DetailList items={items} />
      </CardContent>
    </Card>
  )
}

// Takes `t` so "Yes" and "No" are the reader's language.
const yesNo = (value: boolean, t: TFunction) => (value ? t('common.yes') : t('common.no'))
const joined = (list: string[], separator = ', ') => (list.length ? list.join(separator) : null)

// A delivery's page in the redesign (spec 0011): breadcrumb, title, status and actions; on the
// left what is happening and what happened, on the right the facts. Everything the old page
// showed is still here (AC-3).
export function DeliveryDetails(props: DeliveryDetailsProps) {
  const { goToDeliveries } = useAdminPageNavigator()
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // Dates and money in the reader's language, on Athens time (spec 0054, AC-3).
  const f = useFormat()
  // useServerText's errorText: the server's refusal in the reader's language, else our own sentence.
  const { errorText } = useServerText()

  // Asked again every 30 s, like the list, because an offer can now end or move on its own.
  // Paused while the tab is in the background: 0 means no polling.
  const pageVisible = usePageVisible()
  const getDeliveryResponse = useGetDeliveryQuery(
    { id: props.deliveryId },
    { pollingInterval: pageVisible ? 30_000 : 0 }
  )
  // `currentData` is the answer for THIS id only. `data` keeps the previous delivery while the next
  // one loads, so after a click on another leg its Assign, Reassign, Cancel and status buttons would
  // act on the previous leg (agy's review of row 10). A poll of the same id keeps `currentData`.
  const delivery = getDeliveryResponse.currentData
  const now = useNow(30_000)
  // Every rider's name by id, so the event timeline can say who an offer went to.
  const { data: couriers = [] } = useGetAllCouriersQuery()
  // useMemo keeps the same Map between renders until the courier list itself changes.
  const courierNameById = React.useMemo(
    () => new Map(couriers.map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()])),
    [couriers]
  )

  const [submitDeliveryEvent] = useSubmitDeliveryEventMutation()
  const { toast } = useToast()

  const handleEventSubmit = async (eventType: EnumDeliveryEventType) => {
    if (!delivery || !confirm(t('deliveries.details.confirmEvent', { event: eventTypeLabel(t, eventType) }))) {
      return
    }

    const courierId = courierIdForAdminEvent(eventType, delivery)

    try {
      await submitDeliveryEvent({
        deliveryId: delivery.id,
        eventType: eventType,
        courierId,
      }).unwrap()
    } catch (error) {
      toast({
        title: t('deliveries.details.transitionFailed'),
        description: errorText(error, t('deliveries.details.transitionFailedDescription')),
        variant: 'destructive',
      })
    }
  }

  // The h1 is there in every state ("Delivery" while loading or on an error).
  // Loading also while a new id's answer is on its way (no `currentData` yet and no error).
  if (getDeliveryResponse.isLoading || (!delivery && !getDeliveryResponse.isError))
    return (
      <>
        <PageHeader title={t('deliveries.details.pageTitle')} />
        <span>{t('deliveries.details.loading')}</span>
      </>
    )
  if (!delivery)
    return (
      <>
        <PageHeader title={t('deliveries.details.pageTitle')} />
        <span>{t('deliveries.details.loadFailed')}</span>
      </>
    )

  const allowedEvents = adminEventsForStatus(delivery.status, delivery)
  // A cancel has its own button and dialog, which asks who asked for it (spec 0015, AC-5).
  const canCancel = allowedEvents.includes(EnumDeliveryEventType.CANCELED)
  const possibleEvents = allowedEvents.filter((eventType) => eventType !== EnumDeliveryEventType.CANCELED)
  // The order reference and the end of the id: the legs of one order share a reference (locked
  // design: N legs, one orderReference), so the id is what tells them apart (row 88 review).
  const title = delivery.orderReference
    ? t('deliveries.details.titleWithReference', { reference: delivery.orderReference, id: shortId(delivery.id) })
    : t('deliveries.details.title', { id: shortId(delivery.id) })

  return (
    <>
      <Breadcrumb steps={[{ label: t('deliveries.list.title'), href: '/deliveries', onClick: () => goToDeliveries() }, { label: title }]} />
      <PageHeader
        title={title}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Only while nobody has accepted: once a rider holds it there is nothing to assign. */}
            {isLookingForRider(delivery) ? <AssignCourierCell delivery={delivery} /> : null}
            <ReassignCourierDialog delivery={delivery} />
            {canCancel ? <CancelDeliveryDialog delivery={delivery} /> : null}
            {possibleEvents.length ? (
              <Menu>
                <MenuTrigger>{t('deliveries.details.changeStatus')}</MenuTrigger>
                <MenuItems>
                  {possibleEvents.map((eventType) => (
                    <MenuItem key={eventType} onClick={() => handleEventSubmit(eventType)}>
                      {eventTypeLabel(t, eventType)}
                    </MenuItem>
                  ))}
                </MenuItems>
              </Menu>
            ) : null}
          </div>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <StatusBadge status={delivery.status} />
        <span>{t('deliveries.details.created', { date: f.dateTime(delivery.createdAt) })}</span>
        {/* The same words as the list's Courier column while the delivery is offered. */}
        {isLookingForRider(delivery) ? (
          <span>
            <OfferSummary delivery={delivery} now={now} nameStyle="full" />
            {deliveryOffer(delivery) ? null : t('deliveries.offer.lookingForRider')}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <OfferCard delivery={delivery} now={now} />
          <CancellationCard delivery={delivery} />
          <WaitChargesCard delivery={delivery} />
          <DeliveryIssues deliveryId={delivery.id} />
          <DeliveryRemovalRequests deliveryId={delivery.id} />
          <ProductReportsCard deliveryId={delivery.id} />
          {/* Spec 0052 (AC-3): file a complaint about the rider for someone who phoned in. */}
          <FileComplaintCard deliveryId={delivery.id} />
          <DeliveryEventTimeline deliveryId={delivery.id} courierNameById={courierNameById} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <FactsCard
            title={t('deliveries.details.pickup')}
            items={[
              { label: t('deliveries.details.business'), value: delivery.pickupBusinessName },
              { label: t('deliveries.details.name'), value: delivery.pickupName },
              { label: t('deliveries.details.phone'), value: delivery.pickupPhoneNumber },
              { label: t('deliveries.details.ready'), value: optionalDateTime(f, delivery.pickupReadyAt) },
              { label: t('deliveries.details.deadline'), value: optionalDateTime(f, delivery.pickupDeadlineAt) },
              { label: t('deliveries.details.notes'), value: delivery.pickupNotes },
              { label: t('deliveries.details.verification'), value: displayText(delivery.pickupVerification) },
            ]}
          />
          <FactsCard
            title={t('deliveries.details.dropoff')}
            items={[
              { label: t('deliveries.details.name'), value: delivery.dropoffName },
              { label: t('deliveries.details.business'), value: displayText(delivery.dropoffBusinessName) },
              { label: t('deliveries.details.phone'), value: delivery.dropoffPhoneNumber },
              // Row 99: their own fields, not only inside the composed note.
              { label: t('deliveries.details.floor'), value: displayText(delivery.dropoffFloor) },
              { label: t('deliveries.details.doorbell'), value: displayText(delivery.dropoffDoorbell) },
              { label: t('deliveries.details.eta'), value: optionalDateTime(f, delivery.dropoffEta) },
              { label: t('deliveries.details.ready'), value: optionalDateTime(f, delivery.dropoffReadyAt) },
              { label: t('deliveries.details.deadline'), value: optionalDateTime(f, delivery.dropoffDeadlineAt) },
              { label: t('deliveries.details.notes'), value: delivery.dropoffNotes },
              { label: t('deliveries.details.sellerNotes'), value: delivery.dropoffSellerNotes },
              { label: t('deliveries.details.verification'), value: displayText(delivery.dropoffVerification) },
              { label: t('deliveries.details.whenDelivered'), value: delivery.deliverableAction },
              { label: t('deliveries.details.whenUndeliverable'), value: delivery.undeliverableAction },
              { label: t('deliveries.details.undeliverableReason'), value: delivery.undeliverableReason },
            ]}
          />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('deliveries.details.order')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <DetailList
                items={[
                  { label: t('deliveries.details.orderReference'), value: delivery.orderReference },
                  // Spec 0046 (AC-6): which leg of a multi leg order this is.
                  { label: t('deliveries.details.leg'), value: legText(delivery, t) },
                  // Spec 0043 (AC-8): "Medium, 50 units", with "assumed" when no size was sent.
                  { label: t('deliveries.details.boxSize'), value: boxSizeText(delivery, t) },
                  { label: t('deliveries.details.customer'), value: delivery.customerName },
                  { label: t('deliveries.details.customerPhone'), value: delivery.customerPhoneNumber },
                  { label: t('deliveries.details.orderTotal'), value: f.money(delivery.orderTotalValue, delivery.currencyCode) },
                  { label: t('deliveries.details.tips'), value: f.money(delivery.tips, delivery.currencyCode) },
                  { label: t('deliveries.details.customerNotes'), value: joined(delivery.customerNotes, '\n') },
                  { label: t('deliveries.details.deliveryTypes'), value: joined(delivery.deliveryTypes) },
                  { label: t('deliveries.details.pickupTypes'), value: joined(delivery.pickupTypes) },
                  { label: t('deliveries.details.signatureRequired'), value: yesNo(delivery.requiresDropoffSignature, t) },
                  { label: t('deliveries.details.idCheckRequired'), value: yesNo(delivery.requiresId, t) },
                ]}
              />
              <OrderItemsSection items={delivery.orderItems} />
            </CardContent>
          </Card>
          {/* Spec 0046 (AC-6, cross check 5): the order's other legs and any never sent. */}
          {delivery.legCount && delivery.orderLegs?.length ? (
            <OrderLegsCard
              deliveryId={delivery.id}
              legCount={delivery.legCount}
              legs={delivery.orderLegs}
              missingLegNumbers={delivery.missingLegNumbers ?? []}
            />
          ) : null}
          {/* Spec 0048 (AC-12): the other order of a stack and the order of its stops; row 81: an add on too,
              open (no group yet) or accepted (it joins its job's pair). */}
          {delivery.offerGroupId || delivery.addOn ? (
            <StackedOrderCard
              deliveryId={delivery.id}
              stackStops={delivery.stackStops}
              offerReasons={delivery.offerReasons}
              addOnExtraKm={delivery.addOnExtraKm}
              addOnExtraMinutes={delivery.addOnExtraMinutes}
              addOn={delivery.addOn}
            />
          ) : null}
          <PriceBreakdownCard delivery={delivery} />
          {/* Spec 0044 (AC-8): why each offer went to its rider. */}
          <OfferReasonsCard reasons={delivery.offerReasons} courierNameById={courierNameById} />
          <Card>
            <CardContent className="pt-2">
              <Accordion type="single" collapsible>
                <AccordionItem value="technical">
                  <AccordionTrigger>{t('deliveries.technical.title')}</AccordionTrigger>
                  <AccordionContent>
                    <DetailList
                      items={[
                        { label: t('deliveries.technical.deliveryId'), value: delivery.id, mono: true },
                        { label: t('deliveries.technical.quoteId'), value: delivery.deliveryQuoteId, mono: true },
                        { label: t('deliveries.technical.partnerId'), value: delivery.partnerId, mono: true },
                        { label: t('deliveries.technical.courierId'), value: delivery.courierId, mono: true },
                        { label: t('deliveries.technical.matchedCourierId'), value: delivery.matchedCourierId, mono: true },
                        { label: t('deliveries.technical.pickupLocationId'), value: delivery.pickupLocationId, mono: true },
                        { label: t('deliveries.technical.dropoffLocationId'), value: delivery.dropoffLocationId, mono: true },
                        { label: t('deliveries.technical.externalId'), value: delivery.externalId, mono: true },
                        { label: t('deliveries.technical.externalStoreId'), value: delivery.externalStoreId, mono: true },
                        { label: t('deliveries.technical.idempotencyKey'), value: delivery.idempotencyKey, mono: true },
                      ]}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
