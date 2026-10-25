export enum EnumDeliveryEventType {
  CREATED = 'CREATED',
  CONFIRMED = 'CONFIRMED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DISPATCHED = 'DISPATCHED',
  CANCELED = 'CANCELED',
  FULFILLED = 'FULFILLED',
  ARRIVED_AT_DROPOFF_LOCATION = 'ARRIVED_AT_DROPOFF_LOCATION',
  DROPPED_OFF = 'DROPPED_OFF',
  ARRIVED_AT_PICKUP_LOCATION = 'ARRIVED_AT_PICKUP_LOCATION',
  PICKED_UP = 'PICKED_UP',
  ON_THE_WAY = 'ON_THE_WAY',
  FAILED = 'FAILED',
  // Offer expiry (spec 0002). The platform records these by itself; an admin never submits
  // them, so they are deliberately absent from STATE_MACHINE and the admin event menus.
  OFFERED = 'OFFERED',
  OFFER_EXPIRED = 'OFFER_EXPIRED',
  NO_COURIER_AVAILABLE = 'NO_COURIER_AVAILABLE'
}

export enum EnumEventActor {
  COURIER = 'COURIER',
  ADMIN = 'ADMIN',
  PARTNER = 'PARTNER',
  // Events the platform raises on its own: automatic offers, expiries, "no rider free".
  SYSTEM = 'SYSTEM'
}

export enum EnumDeliveryEventSource {
  OPENCOURIER = 'OPENCOURIER',
  PARTNER_APP = 'PARTNER_APP'
}

// The words the event timeline shows for who caused an event and where it came from, so the
// page never prints the raw enum ("SYSTEM · OPENCOURIER").
export const EVENT_ACTOR_TO_HUMAN: Record<EnumEventActor, string> = {
  COURIER: 'Courier',
  ADMIN: 'Admin',
  PARTNER: 'Partner',
  SYSTEM: 'System',
}

export const EVENT_SOURCE_TO_HUMAN: Record<EnumDeliveryEventSource, string> = {
  OPENCOURIER: 'OpenCourier',
  PARTNER_APP: 'Partner app',
}

export enum EnumDeliveryStatus {
  CREATED = 'CREATED',
  ASSIGNING_COURIER = 'ASSIGNING_COURIER',
  ACCEPTED = 'ACCEPTED',
  DISPATCHED = 'DISPATCHED',
  COURIER_ARRIVED_AT_PICKUP_LOCATION = 'COURIER_ARRIVED_AT_PICKUP_LOCATION',
  PICKED_UP = 'PICKED_UP',
  ON_THE_WAY = 'ON_THE_WAY',
  COURIER_ARRIVED_AT_DROPOFF_LOCATION = 'COURIER_ARRIVED_AT_DROPOFF_LOCATION',
  DROPPED_OFF = 'DROPPED_OFF',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED'
}

export interface BaseDeliveryEvent {
  deliveryId: string
  type: EnumDeliveryEventType
  actor: EnumEventActor
  source: EnumDeliveryEventSource
  courierId?: string | null
  message?: string
}

export interface DeliveryCreatedEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.CREATED
}
export interface DeliveryConfirmedEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.CONFIRMED
}
export interface DeliveryAcceptedEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.ACCEPTED
}
export interface DeliveryRejectedEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.REJECTED
}
export interface DeliveryCanceledEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.CANCELED
}
export interface DeliveryFailedEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.FAILED
}

export interface DeliveryFulfilledEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.FULFILLED
}

export interface DeliveryDispatchedEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.DISPATCHED
}

export interface DeliveryCourierArrivedAtPickUpLocationEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.ARRIVED_AT_PICKUP_LOCATION
}

export interface DeliveryPickedUpEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.PICKED_UP
}

export interface DeliveryCourierArrivedAtDropOffLocationEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.ARRIVED_AT_DROPOFF_LOCATION
}
export interface DeliveryOnTheWayEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.ON_THE_WAY
}

export interface DeliveryOfferedEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.OFFERED
}
export interface DeliveryOfferExpiredEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.OFFER_EXPIRED
}
export interface DeliveryNoCourierAvailableEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.NO_COURIER_AVAILABLE
}

export interface DeliveryDroppedOffEvent extends BaseDeliveryEvent {
  type: typeof EnumDeliveryEventType.DROPPED_OFF
  deliveredData: {
    imageData?: Buffer
    imageName?: string
    imageType?: string
  }
}

export type DeliveryEvent =
  | DeliveryCreatedEvent
  | DeliveryAcceptedEvent
  | DeliveryDispatchedEvent
  | DeliveryRejectedEvent
  | DeliveryConfirmedEvent
  | DeliveryFulfilledEvent
  | DeliveryCourierArrivedAtPickUpLocationEvent
  | DeliveryPickedUpEvent
  | DeliveryOnTheWayEvent
  | DeliveryCourierArrivedAtDropOffLocationEvent
  | DeliveryDroppedOffEvent
  | DeliveryCanceledEvent
  | DeliveryFailedEvent
  | DeliveryOfferedEvent
  | DeliveryOfferExpiredEvent
  | DeliveryNoCourierAvailableEvent

export interface ResolvedPendingKeyRotation {
  accountKeys: []
}

export interface DeliveryStatusUpdateEvent {
  deliveryId: string
  oldStatus: EnumDeliveryStatus
  status: EnumDeliveryStatus
  event: DeliveryEvent
  courierId?: string
}

export const ACTIVE_STATUSES: EnumDeliveryStatus[] = [
  EnumDeliveryStatus.CREATED,
  EnumDeliveryStatus.DISPATCHED,
  EnumDeliveryStatus.PICKED_UP,
  EnumDeliveryStatus.ON_THE_WAY,
  EnumDeliveryStatus.DROPPED_OFF,
  EnumDeliveryStatus.CANCELED,
]
export const NOT_ACTIVE_STATUSES: EnumDeliveryStatus[] = [EnumDeliveryStatus.CANCELED, EnumDeliveryStatus.DROPPED_OFF]
