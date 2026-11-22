// Backend enum values as words (spec 0054, row 47). These were the `*_TO_HUMAN` maps in
// src/shared-types; the English is theirs word for word, so the English screens read as before.
// Show one with `enumLabel(t, 'deliveryStatus', value)` (src/i18n/enumLabel.ts), which falls back to
// the raw value for a value the backend added later.
export const enums = {
  deliveryStatus: {
    CREATED: 'Created',
    ASSIGNING_COURIER: 'Assigning Courier',
    ACCEPTED: 'Accepted',
    DISPATCHED: 'Dispatched',
    COURIER_ARRIVED_AT_PICKUP_LOCATION: 'Courier at Pickup',
    PICKED_UP: 'Picked Up',
    ON_THE_WAY: 'On the Way',
    COURIER_ARRIVED_AT_DROPOFF_LOCATION: 'Courier at Dropoff',
    DROPPED_OFF: 'Dropped Off',
    CANCELED: 'Canceled',
    FAILED: 'Failed',
  },
  removalRequestStatus: {
    OPEN: 'Waiting for dispatch',
    APPROVED: 'Approved',
    DECLINED: 'Declined',
    WITHDRAWN: 'Withdrawn by the rider',
    CLOSED: 'Closed: the order ended or changed rider before an answer',
  },
  paymentStatus: {
    CANCELED: 'Canceled',
    REQUIRES_CONFIRMATION: 'Requires Confirmation',
    REQUIRES_CAPTURE: 'Waiting to be captures',
    PROCESSING: 'Processing',
    REQUIRES_ACTION: 'Requires customer action',
    REQUIRES_PAYMENT_METHOD: 'Missing a valid payment method',
    SUCCEEDED: 'Succeeded',
  },
  courierStatus: {
    ONLINE: 'Online',
    OFFLINE: 'Offline',
    LAST_CALL: 'Last Call',
  },
  eventActor: {
    COURIER: 'Courier',
    ADMIN: 'Admin',
    PARTNER: 'Partner',
    SYSTEM: 'System',
  },
  eventSource: {
    OPENCOURIER: 'OpenCourier',
    PARTNER_APP: 'Partner app',
  },
  deliveryIssueReason: {
    WRONG_ADDRESS: 'Wrong address',
    NO_SIGNAL: 'No internet, GPS or signal',
    ORDER_HANDED: 'Order handed to the customer',
    FOOD_NOT_READY: 'Marked ready but not ready',
    OTHER: 'Other',
  },
  courierMatcherType: {
    NEAREST_COURIER: 'Nearest courier',
    COURIER_SENIORITY: 'Courier seniority',
    STATIC: 'Static courier id (For development)',
    FAIRNESS: 'Fairness (co-op weights)',
  },
  courierCompensationType: {
    FROM_QUOTE_FROM: "Simple (pays the rider the quote's base fee plus distance fee)",
  },
  currency: {
    USD: 'USD (US Dollar)',
    EUR: 'EUR (Euro)',
  },
  deliveryDurationType: {
    SIMPLE: 'Simple (Distance * 2)',
    OSRM: 'OSRM routed duration (moped profile)',
  },
  distanceUnit: {
    KILOMETERS: 'Kilometers',
    MILES: 'Miles',
  },
  geoCalculationType: {
    HAVERSINE: 'Haversine distance (Areal distance)',
    GOOGLE_MATRIX_API: 'Google Matrix API',
    RANDOM: 'Random distance (For development)',
    OSRM: 'OSRM road routing (moped profile)',
  },
  quoteCalculationType: {
    BY_DISTANCE: 'By distance',
    SURGE: 'Surge pricing',
    CUSTOM: 'Custom implementation, random distance (For development)',
  },
  quoteToDeliveryConversionType: {
    SIMPLE: 'Only check drift',
  },
  dietaryRestriction: {
    NONE: 'None',
    VEGAN: 'Vegan',
    VEGETARIAN: 'Vegetarian',
    HALAL: 'Halal',
    KOSHER: 'Kosher',
    GLUTEN_FREE: 'Gluten Free',
    LACTOSE_FREE: 'Lactose Free',
    NUT_FREE: 'Nut Free',
    SEAFOOD_FREE: 'Seafood Free',
    OTHER: 'Other',
  },
}
