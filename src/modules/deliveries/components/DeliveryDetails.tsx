import React from 'react'
import { useGetDeliveryQuery, useSubmitDeliveryEventMutation } from '@/api/deliveriesApi'
import { useGetAllCouriersQuery } from '@/api/couriersApi'
import { useNow } from '@/hooks/useNow'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { AssignCourierCell } from '@/modules/deliveries/components/AssignCourierCell'
import { ReassignCourierDialog } from '@/modules/deliveries/components/ReassignCourierDialog'
import { DeliveryEventTimeline } from '@/modules/deliveries/components/DeliveryEventTimeline'
import { OfferSummary } from '@/modules/deliveries/components/OfferSummary'
import { deliveryOffer, isLookingForRider, minutesWaiting } from '@/modules/deliveries/utils/offer'
import { formatMoney } from '@/utils/formatMoney'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailList,
  Label,
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
import { cn, formatDate, formatOptionalDate, formatTimeWithSeconds } from '../../../ui-shared-utils'
import capitalize from 'lodash/capitalize'
import { ArrowLeft } from '@phosphor-icons/react'

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

// One row of the price breakdown: a label and an amount in minor currency units.
function MoneyRow({ label, amount, currencyCode }: { label: string; amount: number | null | undefined; currencyCode: string }) {
  return (
    <Label className="flex flex-col space-y-1">
      <span>{label}</span>
      <span className="font-normal leading-snug text-muted-foreground">{formatMoney(amount, currencyCode) ?? '—'}</span>
    </Label>
  )
}

// How this delivery's price and the rider's pay were built (spec 0001), so members can audit
// it without reading the database. The base and distance fees come from the delivery's quote;
// the rest is written when the delivery is first offered to a rider. Total cost, fee and total
// compensation are shown here only, under clearer names, rather than twice on the page.
function PriceBreakdownCard({ delivery }: { delivery: DeliveryAdminDto }) {
  const feeLabel = delivery.feePercentage != null ? `Co-op fee (${delivery.feePercentage}%)` : 'Co-op fee'
  const notOfferedYet = delivery.totalCompensation == null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price breakdown</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
        <MoneyRow label="Base fee" amount={delivery.baseFee} currencyCode={delivery.currencyCode} />
        <MoneyRow label="Distance fee" amount={delivery.distanceFee} currencyCode={delivery.currencyCode} />
        <MoneyRow
          label="Rider pay (base fee + distance fee)"
          amount={delivery.totalCompensation}
          currencyCode={delivery.currencyCode}
        />
        <MoneyRow label={feeLabel} amount={delivery.fee} currencyCode={delivery.currencyCode} />
        <MoneyRow label="Customer total" amount={delivery.totalCost} currencyCode={delivery.currencyCode} />
        {notOfferedYet ? (
          <p className="text-muted-foreground sm:col-span-2">
            Rider pay, co-op fee and customer total are set when the delivery is first offered to a rider.
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
  const overdue = delivery.offerExpiresAt != null && delivery.offerExpiresAt.getTime() < now.getTime()

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
  isSheet?: boolean
}

export function DeliveryDetails(props: DeliveryDetailsProps) {
  const { goToDeliveries } = useAdminPageNavigator()

  // Asked again every 30 s, like the list, because an offer can now end or move on its own.
  const getDeliveryResponse = useGetDeliveryQuery({ id: props.deliveryId }, { pollingInterval: 30_000 })
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

  if (getDeliveryResponse.isLoading) return <span>Loading delivery data.</span>
  if (!getDeliveryResponse.data) return <span>There was a problem loading data.</span>

  const { data: delivery } = getDeliveryResponse

  const possibleEvents = adminEventsForStatus(delivery.status, delivery)

  return (
    <>
      {!props.isSheet && (
        <Button variant="link" className="p-0" onClick={() => goToDeliveries()}>
          <div className="bg-gray-100 rounded-full h-6 w-6 flex justify-center items-center mr-1">
            <ArrowLeft className="w-4" />
          </div>
          Back to Deliveries
        </Button>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-end">
          <h2 className="text-xl font-medium tracking-tight">Delivery {delivery.id}</h2>
          <span className="ml-2 text-base font-normal leading-snug text-muted-foreground">
          </span>
        </div>
        <span className="text-sm text-muted-foreground">{formatDate(delivery.createdAt)}</span>
      </div>

      <div className="mt-6 grid gap-6">
        <div className={cn('flex flex-col gap-6', { 'md:flex-row': !props.isSheet })}>
          <div className="flex items-center gap-2">
            <span>Status</span>
            <span className="font-normal leading-snug text-muted-foreground">
              <StatusBadge status={delivery.status} />
            </span>
          </div>

          {/* Only while nobody has accepted: once a rider holds it there is no offer to show or assign. */}
          {isLookingForRider(delivery) ? (
            <div
              className="flex flex-wrap items-center gap-2 md:items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* The same words as the list's Offer column, with the full name. */}
              <span className="text-sm text-muted-foreground">
                Offer:{' '}
                <span className="text-foreground">
                  <OfferSummary delivery={delivery} now={now} nameStyle="full" />
                  {deliveryOffer(delivery) ? null : 'looking for a rider'}
                </span>
              </span>
              <AssignCourierCell delivery={delivery} />
            </div>
          ) : null}

          <ReassignCourierDialog delivery={delivery} />

          {possibleEvents.length ? (
            <Menu>
              <MenuTrigger>Trigger event</MenuTrigger>
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

        <OfferCard delivery={delivery} now={now} />

        <DeliveryEventTimeline deliveryId={delivery.id} courierNameById={courierNameById} />

        <Card>
          <CardHeader>
            <CardTitle>Order & identifiers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Label className="flex flex-col space-y-1">
              <span>Order reference</span>
              <span className="font-normal leading-snug text-muted-foreground break-all">
                {delivery.orderReference ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Customer</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {delivery.customerName}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Customer phone</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {delivery.customerPhoneNumber ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Currency</span>
              <span className="font-normal leading-snug text-muted-foreground">{delivery.currencyCode}</span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Order total</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {formatMoney(delivery.orderTotalValue, delivery.currencyCode) ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Pay</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {formatMoney(delivery.pay, delivery.currencyCode) ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Tips</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {formatMoney(delivery.tips, delivery.currencyCode) ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Courier ID</span>
              <span className="font-normal leading-snug text-muted-foreground break-all">
                {delivery.courierId ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Partner ID</span>
              <span className="font-normal leading-snug text-muted-foreground break-all">
                {delivery.partnerId ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Delivery quote ID</span>
              <span className="font-normal leading-snug text-muted-foreground break-all">
                {delivery.deliveryQuoteId}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>External store ID</span>
              <span className="font-normal leading-snug text-muted-foreground break-all">
                {delivery.externalStoreId ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>External ID</span>
              <span className="font-normal leading-snug text-muted-foreground break-all">
                {delivery.externalId ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Idempotency key</span>
              <span className="font-normal leading-snug text-muted-foreground break-all">
                {delivery.idempotencyKey ?? '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1 sm:col-span-2">
              <span>Delivery types</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {delivery.deliveryTypes.length ? delivery.deliveryTypes.join(', ') : '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1 sm:col-span-2">
              <span>Pickup types</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {delivery.pickupTypes.length ? delivery.pickupTypes.join(', ') : '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1 sm:col-span-2">
              <span>Customer notes</span>
              <span className="font-normal leading-snug text-muted-foreground whitespace-pre-wrap">
                {delivery.customerNotes.length ? delivery.customerNotes.join('\n') : '—'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>Dropoff signature required</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {delivery.requiresDropoffSignature ? 'Yes' : 'No'}
              </span>
            </Label>
            <Label className="flex flex-col space-y-1">
              <span>ID check required</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {delivery.requiresId ? 'Yes' : 'No'}
              </span>
            </Label>
          </CardContent>
        </Card>

        <PriceBreakdownCard delivery={delivery} />

        <Card>
          <CardHeader>
            <CardTitle>Pickup, drop-off & items</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <h3 className="text-sm font-medium sm:col-span-2">Pickup</h3>
              <Label className="flex flex-col space-y-1">
                <span>Name</span>
                <span className="font-normal leading-snug text-muted-foreground">{delivery.pickupName}</span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Phone</span>
                <span className="font-normal leading-snug text-muted-foreground">{delivery.pickupPhoneNumber}</span>
              </Label>
              <Label className="flex flex-col space-y-1 sm:col-span-2">
                <span>Business</span>
                <span className="font-normal leading-snug text-muted-foreground">{delivery.pickupBusinessName}</span>
              </Label>
              <Label className="flex flex-col space-y-1 sm:col-span-2">
                <span>Notes</span>
                <span className="font-normal leading-snug text-muted-foreground whitespace-pre-wrap">
                  {delivery.pickupNotes ?? '—'}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Location ID</span>
                <span className="font-normal leading-snug text-muted-foreground break-all">{delivery.pickupLocationId}</span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Verification</span>
                <span className="font-normal leading-snug text-muted-foreground break-all">
                  {delivery.pickupVerification ?? '—'}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Pickup ready</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {formatOptionalDate(delivery.pickupReadyAt)}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Pickup deadline</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {formatOptionalDate(delivery.pickupDeadlineAt)}
                </span>
              </Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 border-t pt-6">
              <h3 className="text-sm font-medium sm:col-span-2">Drop-off</h3>
              <Label className="flex flex-col space-y-1">
                <span>Name</span>
                <span className="font-normal leading-snug text-muted-foreground">{delivery.dropoffName}</span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Phone</span>
                <span className="font-normal leading-snug text-muted-foreground">{delivery.dropoffPhoneNumber}</span>
              </Label>
              <Label className="flex flex-col space-y-1 sm:col-span-2">
                <span>Business</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {displayText(delivery.dropoffBusinessName)}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1 sm:col-span-2">
                <span>Notes</span>
                <span className="font-normal leading-snug text-muted-foreground whitespace-pre-wrap">
                  {delivery.dropoffNotes ?? '—'}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1 sm:col-span-2">
                <span>Seller notes</span>
                <span className="font-normal leading-snug text-muted-foreground whitespace-pre-wrap">
                  {delivery.dropoffSellerNotes ?? '—'}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Location ID</span>
                <span className="font-normal leading-snug text-muted-foreground break-all">{delivery.dropoffLocationId}</span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Verification</span>
                <span className="font-normal leading-snug text-muted-foreground break-all">
                  {displayText(delivery.dropoffVerification)}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Drop-off ready</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {formatOptionalDate(delivery.dropoffReadyAt)}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Drop-off ETA</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {formatOptionalDate(delivery.dropoffEta)}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Drop-off deadline</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  {formatOptionalDate(delivery.dropoffDeadlineAt)}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Deliverable action</span>
                <span className="font-normal leading-snug text-muted-foreground">{delivery.deliverableAction}</span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Undeliverable action</span>
                <span className="font-normal leading-snug text-muted-foreground">{delivery.undeliverableAction}</span>
              </Label>
              <Label className="flex flex-col space-y-1 sm:col-span-2">
                <span>Undeliverable reason</span>
                <span className="font-normal leading-snug text-muted-foreground whitespace-pre-wrap">
                  {delivery.undeliverableReason ?? '—'}
                </span>
              </Label>
            </div>

            <OrderItemsSection items={delivery.orderItems} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
