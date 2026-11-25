import { EnumCourierDietaryRestrictions } from './courier'
import { EnumCourierCompensationCalculationType } from './courier-compensation-calculation'
import { EnumCourierMatcherType } from './courier-matching'
import { EnumDeliveryDurationCalculationType } from './delivery-duration'
import { EnumGeoCalculationType } from './geo-calculation'
import { EnumQuoteCalculationType } from './quote-calculation'
import { EnumCurrency } from './currency'

export enum EnumDistanceUnit {
  KILOMETERS = 'KILOMETERS',
  MILES = 'MILES'
}

export type InstanceConfigSettings = {
  courierMatcherType: EnumCourierMatcherType
  quoteCalculationType: EnumQuoteCalculationType
  geoCalculationType: EnumGeoCalculationType
  deliveryDurationCalculationType: EnumDeliveryDurationCalculationType
  courierCompensationCalculationType: EnumCourierCompensationCalculationType
  maxAssignmentDistance: number | null
  maxDriftDistance: number | null
  quoteExpirationMinutes: number | null
  feePercentageAmount: number | null
  // Minor currency units per distanceUnit
  quoteRatePerDistanceUnit: number | null
  // Base fee per delivery, in whole cents, paid to the rider on top of the distance part
  quoteBaseFee: number | null
  defaultCourierPayRate: number | null
  defaultMaxWorkingHours: number | null
  defaultDietaryRestrictions: EnumCourierDietaryRestrictions | null
  distanceUnit: EnumDistanceUnit | null
  currency: EnumCurrency | null
  // Percentages of dropped rider piece-rate
  reassignmentPayoutPolicies: Record<string, number>
  reassignmentPayoutDefaultPolicy: string
}

export type InstanceCourierDefaults = {
  defaultCourierPayRate: number | null
  defaultMaxWorkingHours: number | null
  defaultDietaryRestrictions: EnumCourierDietaryRestrictions | null
}

export type InstanceConfigSettingOptions = {
  courierMatcherType: EnumCourierMatcherType[]
  quoteCalculationType: EnumQuoteCalculationType[]
  geoCalculationType: EnumGeoCalculationType[]
  deliveryDurationCalculationType: EnumDeliveryDurationCalculationType[]
  courierCompensationCalculationType: EnumCourierCompensationCalculationType[]
  defaultDietaryRestrictions: EnumCourierDietaryRestrictions[]
  distanceUnit: EnumDistanceUnit[]
  currency: EnumCurrency[]
}

export enum ConfigKey {
  COURIER_APP_MIN_VERSION = 'courierAppMinVersion',
  PARTNER_APP_MIN_VERSION = 'partnerAppMinVersion',
  COURIER_MATCHER_TYPE = 'courierMatcherType',
  QUOTE_CALCULATION_TYPE = 'quoteCalculationType',
  QUOTE_RATE_PER_DISTANCE_UNIT = 'quoteRatePerDistanceUnit',
  QUOTE_BASE_FEE = 'quoteBaseFee',
  QUOTE_TO_DELIVERY_CONVERSION_TYPE = 'quoteToDeliveryConversionType',
  DELIVERY_DURATION_CALCULATION_TYPE = 'deliveryDurationCalculationType',
  GEO_CALCULATION_TYPE = 'geoCalculationType',
  COURIER_COMPENSATION_CALCULATION_TYPE = 'courierCompensationCalculationType',
  FEE_PERCENTAGE_AMOUNT = 'feePercentageAmount',
  FEE_PERCENTAGE_CEILING = 'feePercentageCeiling',
  MAX_ASSIGNMENT_DISTANCE = 'maxAssignmentDistance',
  QUOTE_EXPIRATION_MINUTES = 'quoteExpirationMinutes',
  DEFAULT_COURIER_PAY_RATE = 'defaultCourierPayRate',
  DEFAULT_MAX_WORKING_HOURS = 'defaultMaxWorkingHours',
  DEFAULT_DIETARY_RESTRICTIONS = 'defaultDietaryRestrictions',
  DISTANCE_UNIT = 'distanceUnit',
  CURRENCY = 'currency',
  MAX_DRIFT_DISTANCE = 'maxDriftDistance',
  DETAILS = 'details',
  UPDATED_AT = 'updatedAt',
  REGISTERED_REGISTRIES = 'registeredRegistries',
  REASSIGNMENT_PAYOUT_POLICIES = 'reassignmentPayoutPolicies',
  REASSIGNMENT_PAYOUT_DEFAULT_POLICY = 'reassignmentPayoutDefaultPolicy',
  OFFER_EXPIRY_ENABLED = 'offerExpiryEnabled',
  OFFER_EXPIRY_SECONDS = 'offerExpirySeconds',
  NO_COURIER_RETRY_SECONDS = 'noCourierRetrySeconds',
  OFFER_TIMING_ENABLED = 'offerTimingEnabled',
  OFFER_LEAD_MINUTES = 'offerLeadMinutes',
  OFFER_TIMING_CANDIDATES = 'offerTimingCandidates',
  STACKING_ENABLED = 'stackingEnabled',
  TWO_ORDER_POLICY = 'twoOrderPolicy',
  TWO_ORDER_DELAY_LIMIT_MINUTES = 'twoOrderDelayLimitMinutes',
  ADD_ON_OFFERS_ENABLED = 'addOnOffersEnabled',
  ADD_ON_MOMENT = 'addOnMoment',
  WAIT_PAY_ENABLED = 'waitPayEnabled',
  WAIT_PAY_FREE_MINUTES = 'waitPayFreeMinutes',
  SHIFT_BREAK_MINUTES = 'shiftBreakMinutes',
  WAIT_PAY_CENTS_PER_MINUTE = 'waitPayCentsPerMinute',
  WAIT_LIMIT_MINUTES = 'waitLimitMinutes',
  SPLIT_ANSWER_MINUTES = 'splitAnswerMinutes',
  RETURN_TRIP_PAY_PERCENT = 'returnTripPayPercent',
  BOX_UNITS_SMALL = 'boxUnitsSmall',
  BOX_UNITS_MEDIUM = 'boxUnitsMedium',
  BOX_UNITS_LARGE = 'boxUnitsLarge',
  BOX_DEFAULT_SIZE = 'boxDefaultSize',
  FAIRNESS_WEIGHT_ROAD_TIME = 'fairnessWeightRoadTime',
  FAIRNESS_WEIGHT_EARNINGS = 'fairnessWeightEarnings',
  FAIRNESS_WEIGHT_WAITING = 'fairnessWeightWaiting',
  FAIRNESS_WEIGHT_SHIFT = 'fairnessWeightShift',
  FAIRNESS_CANDIDATE_LIMIT = 'fairnessCandidateLimit',
  FAIRNESS_MIN_ONLINE_MINUTES = 'fairnessMinOnlineMinutes',
  SAVED_CUSTOMER_RETENTION_MONTHS = 'savedCustomerRetentionMonths',
  RESTAURANT_HISTORY_DAYS = 'restaurantHistoryDays',
  HAND_BACK_SECONDS = 'handBackSeconds',
  OFFER_SKIP_MINUTES = 'offerSkipMinutes',
  STACK_PAIR_BLOCK_MINUTES = 'stackPairBlockMinutes',
  SOS_LOCATION_RETENTION_DAYS = 'sosLocationRetentionDays',
  ARRIVAL_RADIUS_METRES = 'arrivalRadiusMetres',
  SHIFTS_ENABLED = 'shiftsEnabled',
  SHIFT_DROP_NOTICE_HOURS = 'shiftDropNoticeHours',
  DISPATCH_PHONE_NUMBER = 'dispatchPhoneNumber',
  CANCELLATION_PAYOUT_POLICY = 'cancellationPayoutPolicy',
  CHAT_QUICK_REPLIES_DISPATCH = 'chatQuickRepliesDispatch',
  CHAT_QUICK_REPLIES_COURIER = 'chatQuickRepliesCourier',
  CHAT_RETENTION_DAYS = 'chatRetentionDays',
  ADDRESS_NOTE_RETENTION_DAYS = 'addressNoteRetentionDays',
  REVIEW_ANSWER_DAYS = 'reviewAnswerDays',
  REVIEW_CORRECTION_MAX_CENTS = 'reviewCorrectionMaxCents',
}

export type ConfigMap = { [key in ConfigKey]?: string | number | boolean | null }
