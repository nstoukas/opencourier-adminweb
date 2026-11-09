import React from 'react'
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
import { ProductReportsCard } from '@/modules/product-reports/ProductReportsCard'
import { OfferSummary } from '@/modules/deliveries/components/OfferSummary'
import { deliveryOffer, isLookingForRider, minutesWaiting } from '@/modules/deliveries/utils/offer'
import { formatMoney } from '@/utils/formatMoney'
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
import { formatDate, formatOptionalDate, formatTimeWithSeconds } from '../../../ui-shared-utils'
import { shortId } from '@/utils/shortId'
import capitalize from 'lodash/capitalize'
import { PageHeader } from '@/components/layouts/PageHeader'

// The server's 3 s grace plus one 30 s refresh of this page.
const OVERDUE_GRACE_MS = 33_000

function displayText(value: string | object | null | undefined): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function OrderItemsSection({ items }: { items: DeliveryAdminDto['orderItems'] }) {
  if (!items?.length) return null
  return (
    <div className="space-y-2 border-t pt-6">
      <h3 className="text-sm font-medium">Order items</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((item, i) => {
          const row = item as Record<string, unknown>
          const name = typeof row.name === 'string' ? row.name : `Item ${i + 1}`
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
  const money = (amount: number | null | undefined) => formatMoney(amount, delivery.currencyCode)
  const feeLabel = delivery.feePercentage != null ? `Co-op fee (${delivery.feePercentage}%)` : 'Co-op fee'
  const notOfferedYet = delivery.totalCompensation == null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Price, from the quote</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DetailList
          items={[
            { label: 'Base fee', value: money(delivery.baseFee) },
            { label: 'Distance fee', value: money(delivery.distanceFee) },
            { label: 'Rider gets (base fee + distance fee)', value: money(delivery.totalCompensation) },
            { label: feeLabel, value: money(delivery.fee) },
            { label: 'Customer pays', value: money(delivery.totalCost) },
            { label: 'Currency', value: delivery.currencyCode },
          ]}
        />
        {notOfferedYet ? (
          <p className="text-muted-foreground">
            Rider pay, co-op fee and what the customer pays are set when the delivery is first offered to a rider.
          </p>
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
          { label: 'Offered to', value: offer.riderName },
          {
            label: 'Offered at',
            value: offer.since ? `${formatTimeWithSeconds(offer.since)} (${minutesWaiting(offer.since, now)} ago)` : null,
          },
          {
            label: overdue ? 'Overdue since' : 'Offer ends',
            value: delivery.offerExpiresAt
              ? formatTimeWithSeconds(delivery.offerExpiresAt)
              : 'Not on its own: offer expiry is off, or an admin made this offer',
          },
        ]
      : [
          { label: 'No rider free since', value: formatTimeWithSeconds(offer.since) },
          { label: 'Waiting', value: minutesWaiting(offer.since, now) },
        ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Offer</CardTitle>
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

const yesNo = (value: boolean) => (value ? 'Yes' : 'No')
const joined = (list: string[], separator = ', ') => (list.length ? list.join(separator) : null)

// A delivery's page in the redesign (spec 0011): breadcrumb, title, status and actions; on the
// left what is happening and what happened, on the right the facts. Everything the old page
// showed is still here (AC-3).
export function DeliveryDetails(props: DeliveryDetailsProps) {
  const { goToDeliveries } = useAdminPageNavigator()

  // Asked again every 30 s, like the list, because an offer can now end or move on its own.
  // Paused while the tab is in the background: 0 means no polling.
  const pageVisible = usePageVisible()
  const getDeliveryResponse = useGetDeliveryQuery(
    { id: props.deliveryId },
    { pollingInterval: pageVisible ? 30_000 : 0 }
  )
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
    if (!getDeliveryResponse.data || !confirm(`Sure you want to trigger "${eventType}" event?`)) {
      return
    }

    const courierId = courierIdForAdminEvent(eventType, getDeliveryResponse.data)

    try {
      await submitDeliveryEvent({
        deliveryId: getDeliveryResponse.data.id,
        eventType: eventType,
        courierId,
      }).unwrap()
    } catch (error) {
      toast({
        title: 'Delivery status transition failed',
        description: 'Failed to change delivery status',
        variant: 'destructive',
      })
    }
  }

  // The h1 is there in every state ("Delivery" while loading or on an error).
  if (getDeliveryResponse.isLoading)
    return (
      <>
        <PageHeader title="Delivery" />
        <span>Loading delivery data.</span>
      </>
    )
  if (!getDeliveryResponse.data)
    return (
      <>
        <PageHeader title="Delivery" />
        <span>There was a problem loading data.</span>
      </>
    )

  const { data: delivery } = getDeliveryResponse
  const allowedEvents = adminEventsForStatus(delivery.status, delivery)
  // A cancel has its own button and dialog, which asks who asked for it (spec 0015, AC-5).
  const canCancel = allowedEvents.includes(EnumDeliveryEventType.CANCELED)
  const possibleEvents = allowedEvents.filter((eventType) => eventType !== EnumDeliveryEventType.CANCELED)
  // The order reference and the end of the id: the legs of one order share a reference (locked
  // design: N legs, one orderReference), so the id is what tells them apart (row 88 review).
  const title = delivery.orderReference
    ? `Delivery ${delivery.orderReference} · ${shortId(delivery.id)}`
    : `Delivery ${shortId(delivery.id)}`

  return (
    <>
      <Breadcrumb steps={[{ label: 'Deliveries', href: '/deliveries', onClick: () => goToDeliveries() }, { label: title }]} />
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
                <MenuTrigger>Change status</MenuTrigger>
                <MenuItems>
                  {possibleEvents.map((eventType) => (
                    <MenuItem key={eventType} onClick={() => handleEventSubmit(eventType)}>
                      {capitalize(eventType.toLowerCase())}
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
        <span>Created {formatDate(delivery.createdAt)}</span>
        {/* The same words as the list's Courier column while the delivery is offered. */}
        {isLookingForRider(delivery) ? (
          <span>
            <OfferSummary delivery={delivery} now={now} nameStyle="full" />
            {deliveryOffer(delivery) ? null : 'Looking for a rider'}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <OfferCard delivery={delivery} now={now} />
          <CancellationCard delivery={delivery} />
          <WaitChargesCard delivery={delivery} />
          <DeliveryIssues deliveryId={delivery.id} />
          <ProductReportsCard deliveryId={delivery.id} />
          <DeliveryEventTimeline deliveryId={delivery.id} courierNameById={courierNameById} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <FactsCard
            title="Pickup"
            items={[
              { label: 'Business', value: delivery.pickupBusinessName },
              { label: 'Name', value: delivery.pickupName },
              { label: 'Phone', value: delivery.pickupPhoneNumber },
              { label: 'Ready', value: formatOptionalDate(delivery.pickupReadyAt) },
              { label: 'Deadline', value: formatOptionalDate(delivery.pickupDeadlineAt) },
              { label: 'Notes', value: delivery.pickupNotes },
              { label: 'Verification', value: displayText(delivery.pickupVerification) },
            ]}
          />
          <FactsCard
            title="Drop off"
            items={[
              { label: 'Name', value: delivery.dropoffName },
              { label: 'Business', value: displayText(delivery.dropoffBusinessName) },
              { label: 'Phone', value: delivery.dropoffPhoneNumber },
              // Row 99: their own fields, not only inside the composed note.
              { label: 'Floor', value: displayText(delivery.dropoffFloor) },
              { label: 'Doorbell', value: displayText(delivery.dropoffDoorbell) },
              { label: 'ETA', value: formatOptionalDate(delivery.dropoffEta) },
              { label: 'Ready', value: formatOptionalDate(delivery.dropoffReadyAt) },
              { label: 'Deadline', value: formatOptionalDate(delivery.dropoffDeadlineAt) },
              { label: 'Notes', value: delivery.dropoffNotes },
              { label: 'Seller notes', value: delivery.dropoffSellerNotes },
              { label: 'Verification', value: displayText(delivery.dropoffVerification) },
              { label: 'When delivered', value: delivery.deliverableAction },
              { label: 'When undeliverable', value: delivery.undeliverableAction },
              { label: 'Undeliverable reason', value: delivery.undeliverableReason },
            ]}
          />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <DetailList
                items={[
                  { label: 'Order reference', value: delivery.orderReference },
                  { label: 'Customer', value: delivery.customerName },
                  { label: 'Customer phone', value: delivery.customerPhoneNumber },
                  { label: 'Order total', value: formatMoney(delivery.orderTotalValue, delivery.currencyCode) },
                  { label: 'Tips', value: formatMoney(delivery.tips, delivery.currencyCode) },
                  { label: 'Customer notes', value: joined(delivery.customerNotes, '\n') },
                  { label: 'Delivery types', value: joined(delivery.deliveryTypes) },
                  { label: 'Pickup types', value: joined(delivery.pickupTypes) },
                  { label: 'Drop off signature required', value: yesNo(delivery.requiresDropoffSignature) },
                  { label: 'ID check required', value: yesNo(delivery.requiresId) },
                ]}
              />
              <OrderItemsSection items={delivery.orderItems} />
            </CardContent>
          </Card>
          <PriceBreakdownCard delivery={delivery} />
          <Card>
            <CardContent className="pt-2">
              <Accordion type="single" collapsible>
                <AccordionItem value="technical">
                  <AccordionTrigger>Technical details</AccordionTrigger>
                  <AccordionContent>
                    <DetailList
                      items={[
                        { label: 'Delivery ID', value: delivery.id, mono: true },
                        { label: 'Delivery quote ID', value: delivery.deliveryQuoteId, mono: true },
                        { label: 'Partner ID', value: delivery.partnerId, mono: true },
                        { label: 'Courier ID', value: delivery.courierId, mono: true },
                        { label: 'Matched courier ID', value: delivery.matchedCourierId, mono: true },
                        { label: 'Pickup location ID', value: delivery.pickupLocationId, mono: true },
                        { label: 'Drop off location ID', value: delivery.dropoffLocationId, mono: true },
                        { label: 'External ID', value: delivery.externalId, mono: true },
                        { label: 'External store ID', value: delivery.externalStoreId, mono: true },
                        { label: 'Idempotency key', value: delivery.idempotencyKey, mono: true },
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
