import { featureCollection } from '@turf/turf'
import { formatMoney } from '@/utils/formatMoney'
import { parseQuoteRateInput } from '@/utils/quoteRate'

/**
 * The co-op settings page's save bar (spec 0010): what the boxes hold, how each setting is
 * compared with its saved value and shown as "old → new", what stops Save, and what Save sends.
 * Plain functions with no React, so each rule can be tested on its own.
 */

// What the page's boxes hold. Number boxes hold the text typed (a string), so an emptied box is
// "" and is never turned into a 0 (row 56). The switch is null until the settings load.
export type SettingsForm = {
  name: string
  link: string
  websocketLink: string
  imageUrl: string
  region: unknown
  courierMatcherType: string
  quoteCalculationType: string
  geoCalculationType: string
  deliveryDurationCalculationType: string
  courierCompensationCalculationType: string
  currency: string
  distanceUnit: string
  defaultDietaryRestrictions: string[]
  quoteBaseFee: string
  quoteRatePerDistanceUnit: string
  feePercentageAmount: string
  feePercentageCeiling: string
  maxAssignmentDistance: string
  maxDriftDistance: string
  arrivalRadiusMetres: string
  quoteExpirationMinutes: string
  defaultCourierPayRate: string
  defaultMaxWorkingHours: string
  offerExpiryEnabled: boolean | null
  offerExpirySeconds: string
  noCourierRetrySeconds: string
  // Restaurant delays (spec 0033): the switch, unknown until loaded, and three numbers.
  waitPayEnabled: boolean | null
  waitPayFreeMinutes: string
  waitPayCentsPerMinute: string
  waitLimitMinutes: string
  // Spec 0047 (AC-2): minutes after a split flag before the rider may leave.
  splitAnswerMinutes: string
  offerTimingEnabled: boolean | null
  offerLeadMinutes: string
  offerTimingCandidates: string
  handBackSeconds: string
  cancellationPayoutPolicy: string
  returnTripPayPercent: string
  savedCustomerRetentionMonths: string
  restaurantHistoryDays: string
  sosLocationRetentionDays: string
  dispatchPhoneNumber: string
  // Shifts (spec 0026): the co-op switch, unknown until loaded, and the drop notice in hours.
  shiftsEnabled: boolean | null
  shiftDropNoticeHours: string
  // Time worked (spec 0040): the longest Offline that stays a break inside one worked shift, in minutes.
  shiftBreakMinutes: string
  // Chat (spec 0034, AC-13 and AC-18): each preset list as typed, one preset per line, and the days
  // messages are kept.
  chatQuickRepliesDispatch: string
  chatQuickRepliesCourier: string
  chatRetentionDays: string
  // Address notes (spec 0053): days a courier note is kept when no rider upvotes it.
  addressNoteRetentionDays: string
  // Review requests (spec 0038): the days a person has to answer, and the largest correction in cents.
  reviewAnswerDays: string
  reviewCorrectionMaxCents: string
  // Box model (spec 0043): the box units each size takes, out of a rider's 100, and the size an
  // order sent with none counts as.
  boxUnitsSmall: string
  boxUnitsMedium: string
  boxUnitsLarge: string
  boxDefaultSize: string
  // Fairness matcher (spec 0044): the three weights, riders compared, minimum minutes online today.
  fairnessWeightRoadTime: string
  fairnessWeightEarnings: string
  fairnessWeightWaiting: string
  fairnessWeightShift: string
  fairnessCandidateLimit: string
  fairnessMinOnlineMinutes: string
  // Two orders at once (spec 0048, row 80): the stacking switch, unknown until loaded, when a stack may be
  // offered, and the most minutes a stack may make a customer wait.
  stackingEnabled: boolean | null
  twoOrderPolicy: string
  twoOrderDelayLimitMinutes: string
  // Row 81: mid job add ons.
  addOnOffersEnabled: boolean | null
  addOnMoment: string
}

export type SettingKey = keyof SettingsForm

// How a setting is compared, shown, checked and sent.
type Kind =
  | 'text' // a free text detail (name)
  | 'url' // a link detail, compared trimmed and without a trailing slash
  | 'region' // the service area drawing, a detail
  | 'select' // one option of a list, sent as is
  | 'multi' // several options of a list
  | 'cents' // whole cents, zero or more, checked here
  | 'number' // a number box; range rules stay with the backend
  | 'switch' // on or off
  | 'phone' // a phone number, compared without the spaces, dashes, dots and brackets the backend removes
  | 'lines' // a list typed one entry per line, sent as a list of the trimmed, non empty lines

export type SettingDefinition = { key: SettingKey; label: string; kind: Kind; details?: boolean }

// Every setting the bar covers, in page order, with the label the bar shows. The details ones
// live inside the backend's `details` object, which is replaced whole (spec 0010, AC-12).
export const SETTINGS: SettingDefinition[] = [
  { key: 'quoteBaseFee', label: 'Base fee', kind: 'cents' },
  { key: 'quoteRatePerDistanceUnit', label: 'Rate per km', kind: 'cents' },
  { key: 'feePercentageAmount', label: 'Co-op fee (%)', kind: 'number' },
  { key: 'feePercentageCeiling', label: 'Co-op fee ceiling (%)', kind: 'number' },
  { key: 'currency', label: 'Currency', kind: 'select' },
  { key: 'distanceUnit', label: 'Distance unit', kind: 'select' },
  { key: 'quoteCalculationType', label: 'Quote calculation', kind: 'select' },
  { key: 'courierMatcherType', label: 'Who gets the offer first', kind: 'select' },
  { key: 'maxAssignmentDistance', label: 'Furthest courier to offer', kind: 'number' },
  { key: 'maxDriftDistance', label: 'Max drift distance', kind: 'number' },
  { key: 'arrivalRadiusMetres', label: 'Arrival radius (metres)', kind: 'number' },
  { key: 'quoteExpirationMinutes', label: 'Quote stays valid for', kind: 'number' },
  { key: 'geoCalculationType', label: 'Measure distance by', kind: 'select' },
  { key: 'deliveryDurationCalculationType', label: 'Delivery duration calculation', kind: 'select' },
  { key: 'offerExpiryEnabled', label: 'Offer expiry', kind: 'switch' },
  { key: 'offerExpirySeconds', label: 'Seconds before an unanswered offer ends', kind: 'number' },
  { key: 'noCourierRetrySeconds', label: 'Seconds between retries when no rider is free', kind: 'number' },
  { key: 'offerTimingEnabled', label: 'Timed offers', kind: 'switch' },
  { key: 'offerLeadMinutes', label: 'Lead time before an offer (minutes)', kind: 'number' },
  { key: 'offerTimingCandidates', label: 'Riders compared by road time', kind: 'number' },
  { key: 'handBackSeconds', label: 'Seconds a rider can hand back an order for free', kind: 'number' },
  { key: 'cancellationPayoutPolicy', label: 'Pay when a job is cancelled', kind: 'select' },
  { key: 'defaultCourierPayRate', label: 'Default courier pay rate', kind: 'number' },
  { key: 'defaultMaxWorkingHours', label: 'Default max working hours', kind: 'number' },
  { key: 'courierCompensationCalculationType', label: 'Courier compensation calculation', kind: 'select' },
  { key: 'returnTripPayPercent', label: 'Return trip pay (%)', kind: 'number' },
  { key: 'waitPayEnabled', label: 'Delay pay', kind: 'switch' },
  { key: 'waitPayFreeMinutes', label: 'Free minutes after the promised time', kind: 'number' },
  { key: 'waitPayCentsPerMinute', label: 'Delay pay per minute (cents)', kind: 'number' },
  { key: 'waitLimitMinutes', label: 'Minutes before a rider can leave', kind: 'number' },
  { key: 'splitAnswerMinutes', label: 'Minutes before a rider can leave an order not split', kind: 'number' },
  { key: 'shiftsEnabled', label: 'Shifts', kind: 'switch' },
  { key: 'shiftDropNoticeHours', label: 'Notice to drop a shift, in hours', kind: 'number' },
  { key: 'shiftBreakMinutes', label: 'Longest break inside a worked shift, in minutes', kind: 'number' },
  { key: 'region', label: 'Service area', kind: 'region', details: true },
  { key: 'name', label: 'Name', kind: 'text', details: true },
  { key: 'link', label: 'URL', kind: 'url', details: true },
  { key: 'websocketLink', label: 'Websocket URL', kind: 'url', details: true },
  { key: 'imageUrl', label: 'Logo image URL', kind: 'url', details: true },
  { key: 'defaultDietaryRestrictions', label: 'Default dietary restrictions', kind: 'multi' },
  { key: 'savedCustomerRetentionMonths', label: 'Saved customer retention (months)', kind: 'number' },
  { key: 'restaurantHistoryDays', label: 'Restaurant order history (days)', kind: 'number' },
  { key: 'sosLocationRetentionDays', label: 'SOS location kept for (days)', kind: 'number' },
  { key: 'dispatchPhoneNumber', label: 'Dispatch phone number', kind: 'phone' },
  // Chat (spec 0034).
  { key: 'chatQuickRepliesDispatch', label: 'Dispatch quick replies', kind: 'lines' },
  { key: 'chatQuickRepliesCourier', label: 'Courier quick replies', kind: 'lines' },
  { key: 'chatRetentionDays', label: 'Chat messages kept for (days)', kind: 'number' },
  // Address notes (spec 0053, AC-6).
  { key: 'addressNoteRetentionDays', label: 'Address notes kept without an upvote (days)', kind: 'number' },
  // Review requests (spec 0038).
  { key: 'reviewAnswerDays', label: 'Days to answer a review request', kind: 'number' },
  { key: 'reviewCorrectionMaxCents', label: 'Largest review pay correction (cents)', kind: 'number' },
  // Box model (spec 0043, AC-2, AC-8).
  { key: 'boxUnitsSmall', label: 'Box units a Small order takes', kind: 'number' },
  { key: 'boxUnitsMedium', label: 'Box units a Medium order takes', kind: 'number' },
  { key: 'boxUnitsLarge', label: 'Box units a Large order takes', kind: 'number' },
  { key: 'boxDefaultSize', label: 'Size of an order sent with none', kind: 'select' },
  // Fairness matcher (spec 0044, AC-5).
  { key: 'fairnessWeightRoadTime', label: "Weight of road time to the restaurant", kind: 'number' },
  { key: 'fairnessWeightEarnings', label: "Weight of the rider's pay per hour today", kind: 'number' },
  { key: 'fairnessWeightWaiting', label: 'Weight of waiting since the last job or going Online', kind: 'number' },
  { key: 'fairnessWeightShift', label: 'Weight of being on a booked shift', kind: 'number' },
  { key: 'fairnessCandidateLimit', label: "Nearest riders compared for each offer", kind: 'number' },
  { key: 'fairnessMinOnlineMinutes', label: "Minutes online before own pay per hour counts", kind: 'number' },
  // Two orders at once (spec 0048, AC-1).
  { key: 'stackingEnabled', label: 'Two orders offered together', kind: 'switch' },
  { key: 'twoOrderPolicy', label: 'When two orders may go together', kind: 'select' },
  { key: 'twoOrderDelayLimitMinutes', label: 'Most minutes a pair may delay a customer', kind: 'number' },
  { key: 'addOnOffersEnabled', label: 'One more order offered while on a job', kind: 'switch' },
  { key: 'addOnMoment', label: 'When one more order may be offered', kind: 'select' },
]

// The words for a setting, shared by its box and the bar (row 87 review). The rate follows the
// distance unit in the boxes.
export function labelOf(key: SettingKey, form?: Pick<SettingsForm, 'distanceUnit'>): string {
  if (key === 'quoteRatePerDistanceUnit') {
    return form?.distanceUnit === 'MILES' ? 'Rate per mile' : 'Rate per km'
  }
  return SETTINGS.find((definition) => definition.key === key)?.label ?? key
}


// A 'lines' box as it is saved: one entry per line, trimmed, blank lines dropped (spec 0034, AC-13).
export function linesOf(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

// The backend's limits for a preset list (AC-13). It refuses the same by name; checking here first
// lets the bar say why before anything is sent.
export const QUICK_REPLIES_MAX_ENTRIES = 8
export const QUICK_REPLY_MAX_LENGTH = 100

// A link as it is saved: trimmed, without a trailing slash (today's sanitizeURL).
export const sanitizeURL = (url: string): string => url.trim().replace(/\/$/, '')

export const isValidURL = (url: string): boolean => {
  if (!url) return true // an empty link is allowed where the field is optional
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// The drawing as the backend stores it: always a FeatureCollection. The map hands back an array
// of drawn features; a seeded instance may hold a bare geometry, kept as it is.
export function normalizeRegion(region: unknown): unknown {
  if (region == null) return null
  if (Array.isArray(region)) return featureCollection(region as any)
  const typed = region as { type?: string }
  if (typed.type === 'Feature') return featureCollection([region as any])
  return region
}

// The value used to decide "changed or not". Two values that save the same are equal here.
function comparable(definition: SettingDefinition, value: unknown): string {
  switch (definition.kind) {
    case 'text':
      return String(value ?? '').trim()
    case 'url':
      return sanitizeURL(String(value ?? ''))
    case 'region':
      return JSON.stringify(normalizeRegion(value))
    case 'multi':
      return [...((value as string[] | undefined) ?? [])].sort().join(',')
    case 'switch':
      return value === null || value === undefined ? '' : String(value)
    case 'lines':
      return linesOf(String(value ?? '')).join('\n')
    case 'phone':
      // The backend stores the number with these removed (row 72), so "+30 24210 12345" typed
      // and "+302421012345" saved are the same number and the edit leaves the bar after a save.
      return String(value ?? '').replace(/[\s().-]/g, '')
    default:
      return String(value ?? '').trim()
  }
}

// True when two values of a setting save the same (an edit that now equals the saved value is
// no longer a change: after a save, the page drops it).
export function sameValue(key: SettingKey, a: unknown, b: unknown): boolean {
  const definition = SETTINGS.find((candidate) => candidate.key === key)
  return definition ? comparable(definition, a) === comparable(definition, b) : a === b
}

export type PendingChange = { key: SettingKey; label: string; from: string; to: string }

// How an empty box reads in the bar; successMessage also reads it to tell a cleared number (review nit).
export const EMPTY_SHOWN = '(empty)'

// How a value reads in the bar. `optionLabel` turns an option's code into its words.
function shown(
  definition: SettingDefinition,
  value: unknown,
  currency: string,
  optionLabel: (key: SettingKey, option: string) => string,
): string {
  if (definition.kind === 'region') return ''
  if (definition.kind === 'lines') {
    const list = linesOf(String(value ?? ''))
    return list.length ? list.join(' · ') : '(none)'
  }
  if (definition.kind === 'switch') return value === true ? 'On' : value === false ? 'Off' : '—'
  if (definition.kind === 'multi') {
    const list = (value as string[] | undefined) ?? []
    return list.length ? list.map((option) => optionLabel(definition.key, option)).join(', ') : '(none)'
  }
  const text = definition.kind === 'url' ? sanitizeURL(String(value ?? '')) : String(value ?? '').trim()
  if (text === '') return EMPTY_SHOWN
  if (definition.kind === 'select') return optionLabel(definition.key, text)
  if (definition.kind === 'cents') {
    const cents = parseQuoteRateInput(text)
    return cents === null ? text : formatMoney(cents, currency) ?? text
  }
  return text
}

// Every setting whose box differs from its saved value, in page order. Nothing is counted
// before the settings load (`saved` is null): null to null is not a change (AC-13).
export function pendingChanges(
  saved: SettingsForm | null,
  edited: SettingsForm,
  optionLabel: (key: SettingKey, option: string) => string = (_key, option) => option,
): PendingChange[] {
  if (saved === null) return []
  return SETTINGS.filter(
    (definition) => comparable(definition, saved[definition.key]) !== comparable(definition, edited[definition.key]),
  ).map((definition) => ({
    key: definition.key,
    label: labelOf(definition.key, edited),
    // Money shows in the currency it was saved in, and the new value in the one being saved.
    from: shown(definition, saved[definition.key], saved.currency, optionLabel),
    to: shown(definition, edited[definition.key], edited.currency, optionLabel),
  }))
}

// One wording for a bad link, in the box and in the bar (row 87 review).
export const urlErrorText = (label: string) => `${label} is not a valid URL`

export const CENTS_ERROR = (label: string) => `${label}: enter a whole number of cents, zero or more`

// Every reason Save is off, in words the bar shows (AC-14). Only changed settings are checked:
// an untouched one keeps its saved value and is not sent. The required details are checked
// whenever any detail changed, because `details` is then sent whole.
export function blockers(changes: PendingChange[], edited: SettingsForm): string[] {
  const changed = new Set(changes.map((change) => change.key))
  const found: string[] = []
  const detailsChanged = SETTINGS.some((definition) => definition.details && changed.has(definition.key))
  if (detailsChanged) {
    if (edited.name.trim() === '') found.push('Name is empty')
    if (edited.link.trim() === '') found.push('URL is empty')
    if (edited.region == null) found.push('Service area is not drawn')
  }
  for (const definition of SETTINGS) {
    if (!changed.has(definition.key)) continue
    const value = edited[definition.key]
    if (definition.kind === 'url' && !isValidURL(sanitizeURL(String(value ?? '')))) {
      found.push(urlErrorText(definition.label))
    }
    if (definition.kind === 'multi' && ((value as string[] | undefined) ?? []).length === 0) {
      found.push(`${definition.label} has nothing selected`)
    }
    if (definition.kind === 'cents' && parseQuoteRateInput(String(value ?? '')) === null) {
      found.push(CENTS_ERROR(definition.label))
    }
    if (definition.kind === 'number' && String(value ?? '').trim() === '') {
      found.push(`${definition.label} is empty`)
    }
    if (definition.kind === 'lines') {
      const list = linesOf(String(value ?? ''))
      if (list.length > QUICK_REPLIES_MAX_ENTRIES) {
        found.push(`${definition.label}: at most ${QUICK_REPLIES_MAX_ENTRIES}, one per line`)
      }
      if (list.some((line) => line.length > QUICK_REPLY_MAX_LENGTH)) {
        found.push(`${definition.label}: each at most ${QUICK_REPLY_MAX_LENGTH} characters`)
      }
    }
  }
  // Spec 0041 (AC-8): the fee may not end above the ceiling. Checked when either changed, with the
  // values the save would leave in effect; the backend checks the same and has the last word.
  if (changed.has('feePercentageAmount') || changed.has('feePercentageCeiling')) {
    const fee = feeAboveCeiling(edited)
    if (fee) found.push(`${labelOf('feePercentageAmount')} is ${fee.fee}, above the co-op's ceiling of ${fee.ceiling} %`)
  }
  // Spec 0043 (AC-2): Small may not take more room than Medium, nor Medium more than Large, with the
  // values the save would leave in effect. The backend checks the same and has the last word.
  if (changed.has('boxUnitsSmall') || changed.has('boxUnitsMedium') || changed.has('boxUnitsLarge')) {
    const order = boxUnitsOutOfOrder(edited)
    if (order) found.push(order)
  }
  // Spec 0044 (AC-5): the three fairness weights cannot all be 0, on the values the save would leave.
  // The backend checks the same and has the last word.
  if (changed.has('fairnessWeightRoadTime') || changed.has('fairnessWeightEarnings') || changed.has('fairnessWeightWaiting')) {
    const allZero = [edited.fairnessWeightRoadTime, edited.fairnessWeightEarnings, edited.fairnessWeightWaiting].every(
      (value) => value.trim() !== '' && Number(value.trim()) === 0
    )
    if (allZero) {
      found.push(
        `${labelOf('fairnessWeightRoadTime')}, ${labelOf('fairnessWeightEarnings')} and ${labelOf('fairnessWeightWaiting')} cannot all be 0`
      )
    }
  }
  return found
}

// Spec 0043: the sentence when the three sizes' units are out of order, else null. Empty or non
// number boxes are left to the "is empty" check and the backend.
export function boxUnitsOutOfOrder(
  form: Pick<SettingsForm, 'boxUnitsSmall' | 'boxUnitsMedium' | 'boxUnitsLarge'>,
): string | null {
  const small = Number(form.boxUnitsSmall.trim())
  const medium = Number(form.boxUnitsMedium.trim())
  const large = Number(form.boxUnitsLarge.trim())
  const known = (text: string, value: number) => text.trim() !== '' && Number.isFinite(value)
  if (known(form.boxUnitsSmall, small) && known(form.boxUnitsMedium, medium) && small > medium) {
    return `Small (${small} units) cannot take more room than Medium (${medium} units)`
  }
  if (known(form.boxUnitsMedium, medium) && known(form.boxUnitsLarge, large) && medium > large) {
    return `Medium (${medium} units) cannot take more room than Large (${large} units)`
  }
  return null
}

// The fee and the ceiling when both are numbers and the fee is above the ceiling, else null.
export function feeAboveCeiling(form: Pick<SettingsForm, 'feePercentageAmount' | 'feePercentageCeiling'>) {
  const fee = form.feePercentageAmount.trim()
  const ceiling = form.feePercentageCeiling.trim()
  if (fee === '' || ceiling === '') return null
  const feeNumber = Number(fee)
  const ceilingNumber = Number(ceiling)
  if (!Number.isFinite(feeNumber) || !Number.isFinite(ceilingNumber) || feeNumber <= ceilingNumber) return null
  return { fee: feeNumber, ceiling: ceilingNumber }
}

// The four public page links the backend keeps beside the URL (today's computedURLs).
export function publicPageUrls(link: string) {
  const base = sanitizeURL(link)
  return {
    privacyPolicyUrl: base ? `${base}/privacy-policy` : '',
    termsOfServiceUrl: base ? `${base}/terms-of-service` : '',
    rulesUrl: base ? `${base}/rules` : '',
    descriptionUrl: base ? `${base}/description` : '',
  }
}

// What Save sends: only the changed top level settings, and the whole `details` object when
// any of its keys changed (AC-12). Call it only when `blockers` is empty.
export function savePayload(
  changes: PendingChange[],
  edited: SettingsForm,
  savedDetails: Record<string, unknown>,
): Record<string, unknown> {
  const changed = new Set(changes.map((change) => change.key))
  const payload: Record<string, unknown> = {}
  let detailsChanged = false
  for (const definition of SETTINGS) {
    if (!changed.has(definition.key)) continue
    if (definition.details) {
      detailsChanged = true
      continue
    }
    const value = edited[definition.key]
    if (definition.kind === 'cents' || definition.kind === 'number') {
      payload[definition.key] = Number(String(value).trim())
    } else if (definition.kind === 'lines') {
      payload[definition.key] = linesOf(String(value ?? ''))
    } else {
      payload[definition.key] = value
    }
  }
  if (detailsChanged) {
    payload.details = {
      ...savedDetails,
      name: edited.name.trim(),
      link: sanitizeURL(edited.link),
      websocketLink: sanitizeURL(edited.websocketLink),
      imageUrl: sanitizeURL(edited.imageUrl),
      region: normalizeRegion(edited.region),
      ...publicPageUrls(edited.link),
    }
  }
  return payload
}

// The boxes filled from the saved settings. Numbers become text; a missing one is an empty box.
export function formFromSettings(data: Record<string, any>): SettingsForm {
  const details = (data.details as Record<string, any> | undefined) ?? {}
  const text = (value: unknown) => (value === null || value === undefined ? '' : String(value))
  return {
    name: details.name ?? '',
    link: details.link ?? '',
    websocketLink: details.websocketLink ?? '',
    imageUrl: details.imageUrl ?? '',
    region: details.region ?? null,
    courierMatcherType: data.courierMatcherType ?? '',
    quoteCalculationType: data.quoteCalculationType ?? '',
    geoCalculationType: data.geoCalculationType ?? '',
    deliveryDurationCalculationType: data.deliveryDurationCalculationType ?? '',
    courierCompensationCalculationType: data.courierCompensationCalculationType ?? '',
    currency: data.currency ?? '',
    distanceUnit: data.distanceUnit ?? '',
    defaultDietaryRestrictions: Array.isArray(data.defaultDietaryRestrictions) ? data.defaultDietaryRestrictions : [],
    quoteBaseFee: text(data.quoteBaseFee),
    quoteRatePerDistanceUnit: text(data.quoteRatePerDistanceUnit),
    feePercentageAmount: text(data.feePercentageAmount),
    feePercentageCeiling: text(data.feePercentageCeiling),
    maxAssignmentDistance: text(data.maxAssignmentDistance),
    maxDriftDistance: text(data.maxDriftDistance),
    arrivalRadiusMetres: text(data.arrivalRadiusMetres),
    quoteExpirationMinutes: text(data.quoteExpirationMinutes),
    defaultCourierPayRate: text(data.defaultCourierPayRate),
    defaultMaxWorkingHours: text(data.defaultMaxWorkingHours),
    offerExpiryEnabled: data.offerExpiryEnabled ?? null,
    offerExpirySeconds: text(data.offerExpirySeconds),
    noCourierRetrySeconds: text(data.noCourierRetrySeconds),
    waitPayEnabled: data.waitPayEnabled ?? null,
    waitPayFreeMinutes: text(data.waitPayFreeMinutes),
    waitPayCentsPerMinute: text(data.waitPayCentsPerMinute),
    waitLimitMinutes: text(data.waitLimitMinutes),
    splitAnswerMinutes: text(data.splitAnswerMinutes),
    offerTimingEnabled: data.offerTimingEnabled ?? null,
    offerLeadMinutes: text(data.offerLeadMinutes),
    offerTimingCandidates: text(data.offerTimingCandidates),
    handBackSeconds: text(data.handBackSeconds),
    // The backend answers the rule in force, FULL_COMPENSATION when none is stored (spec 0015).
    // Before the settings load it is empty, like every other select.
    cancellationPayoutPolicy: data.cancellationPayoutPolicy ?? '',
    returnTripPayPercent: text(data.returnTripPayPercent),
    savedCustomerRetentionMonths: text(data.savedCustomerRetentionMonths),
    restaurantHistoryDays: text(data.restaurantHistoryDays),
    sosLocationRetentionDays: text(data.sosLocationRetentionDays),
    dispatchPhoneNumber: data.dispatchPhoneNumber ?? '',
    shiftsEnabled: data.shiftsEnabled ?? null,
    shiftDropNoticeHours: text(data.shiftDropNoticeHours),
    shiftBreakMinutes: text(data.shiftBreakMinutes),
    chatQuickRepliesDispatch: Array.isArray(data.chatQuickRepliesDispatch) ? data.chatQuickRepliesDispatch.join('\n') : '',
    chatQuickRepliesCourier: Array.isArray(data.chatQuickRepliesCourier) ? data.chatQuickRepliesCourier.join('\n') : '',
    chatRetentionDays: text(data.chatRetentionDays),
    addressNoteRetentionDays: text(data.addressNoteRetentionDays),
    reviewAnswerDays: text(data.reviewAnswerDays),
    reviewCorrectionMaxCents: text(data.reviewCorrectionMaxCents),
    boxUnitsSmall: text(data.boxUnitsSmall),
    boxUnitsMedium: text(data.boxUnitsMedium),
    boxUnitsLarge: text(data.boxUnitsLarge),
    boxDefaultSize: data.boxDefaultSize ?? '',
    fairnessWeightRoadTime: text(data.fairnessWeightRoadTime),
    fairnessWeightEarnings: text(data.fairnessWeightEarnings),
    fairnessWeightWaiting: text(data.fairnessWeightWaiting),
    fairnessWeightShift: text(data.fairnessWeightShift),
    fairnessCandidateLimit: text(data.fairnessCandidateLimit),
    fairnessMinOnlineMinutes: text(data.fairnessMinOnlineMinutes),
    stackingEnabled: data.stackingEnabled ?? null,
    twoOrderPolicy: data.twoOrderPolicy ?? '',
    twoOrderDelayLimitMinutes: text(data.twoOrderDelayLimitMinutes),
    addOnOffersEnabled: data.addOnOffersEnabled ?? null,
    addOnMoment: data.addOnMoment ?? '',
  }
}

// The boxes before anything loads: all empty, the switch unknown.
export const EMPTY_FORM: SettingsForm = formFromSettings({})

// The success words (AC-15): what was saved, plus today's sentence for a setting that has one.
export function successMessage(changes: PendingChange[]): string {
  const keys = new Set(changes.map((change) => change.key))
  const parts = [`Saved: ${changes.map((change) => change.label).join(', ')}.`]
  if (keys.has('quoteBaseFee') || keys.has('quoteRatePerDistanceUnit') || keys.has('feePercentageAmount')) {
    parts.push('Pricing applies to the next quote; deliveries already quoted keep their price.')
  }
  if (keys.has('offerExpiryEnabled') || keys.has('offerExpirySeconds') || keys.has('noCourierRetrySeconds')) {
    parts.push('Offer settings apply to the next offer; an offer already out keeps its deadline.')
  }
  if (keys.has('offerTimingEnabled') || keys.has('offerLeadMinutes') || keys.has('offerTimingCandidates')) {
    parts.push('Timed offers apply to the next offer; an offer already out is not moved.')
  }
  if (
    keys.has('waitPayEnabled') ||
    keys.has('waitPayFreeMinutes') ||
    keys.has('waitPayCentsPerMinute') ||
    keys.has('waitLimitMinutes')
  ) {
    parts.push('Restaurant delay settings apply to waits that end from now on; a wait already paid keeps its amount.')
  }
  if (keys.has('arrivalRadiusMetres')) {
    parts.push("Riders' apps use the new arrival radius within ten minutes.")
  }
  if (keys.has('shiftsEnabled') || keys.has('shiftDropNoticeHours')) {
    parts.push('Riders see nothing of shifts until shift booking is built.')
  }
  if (keys.has('shiftBreakMinutes')) {
    parts.push("Every rider's time worked, past shifts included, is worked out again with the new break length.")
  }
  if (keys.has('handBackSeconds')) {
    parts.push('The hand back applies to the next accept; a running hand back keeps its end.')
  }
  if (keys.has('cancellationPayoutPolicy')) {
    parts.push('Cancelled job pay applies to cancellations from now on.')
  }
  if (keys.has('returnTripPayPercent')) {
    parts.push('Return trip pay applies to food recorded as returned from now on.')
  }
  if (keys.has('savedCustomerRetentionMonths')) {
    parts.push('The daily job uses the retention from its next run.')
  }
  if (keys.has('restaurantHistoryDays')) {
    parts.push('Restaurants see the new order history period at once.')
  }
  if (keys.has('sosLocationRetentionDays')) {
    parts.push('The daily job deletes SOS positions under the new period from its next run.')
  }
  if (keys.has('chatQuickRepliesDispatch') || keys.has('chatQuickRepliesCourier')) {
    parts.push('The new quick replies show the next time a conversation is opened.')
  }
  if (keys.has('chatRetentionDays')) {
    parts.push('The daily job deletes chat messages under the new period from its next run.')
  }
  if (keys.has('addressNoteRetentionDays')) {
    parts.push('The nightly job deletes address notes under the new period from its next run, and riders see the new period in How notes work.')
  }
  if (
    keys.has('stackingEnabled') ||
    keys.has('twoOrderPolicy') ||
    keys.has('twoOrderDelayLimitMinutes') ||
    keys.has('addOnOffersEnabled') ||
    keys.has('addOnMoment')
  ) {
    // Review fix (row 81): an add on change is named as such, not only as "two orders together".
    const addOn = keys.has('addOnOffersEnabled') || keys.has('addOnMoment')
    const stack = keys.has('stackingEnabled') || keys.has('twoOrderPolicy') || keys.has('twoOrderDelayLimitMinutes')
    const what = addOn && stack ? 'Two orders together and one more order on a job' : addOn ? 'One more order on a job' : 'Two orders together'
    parts.push(`${what}: applies to the next offer; offers already out and jobs already taken are unchanged.`)
  }
  if (keys.has('boxUnitsSmall') || keys.has('boxUnitsMedium') || keys.has('boxUnitsLarge')) {
    parts.push('New box units apply to orders made from now on; an order already made keeps its units.')
  }
  if (
    keys.has('fairnessWeightRoadTime') ||
    keys.has('fairnessWeightEarnings') ||
    keys.has('fairnessWeightWaiting') ||
    keys.has('fairnessWeightShift') ||
    keys.has('fairnessCandidateLimit') ||
    keys.has('fairnessMinOnlineMinutes')
  ) {
    parts.push('The fairness settings apply from the next offer.')
  }
  if (keys.has('boxDefaultSize')) {
    parts.push('The default size applies to orders sent without a size from now on.')
  }
  if (keys.has('reviewAnswerDays')) {
    parts.push('New review requests get the new answer period; requests already sent keep their date.')
  }
  if (keys.has('reviewCorrectionMaxCents')) {
    parts.push('The new limit applies to the next answer with a pay correction.')
  }
  const dispatchPhone = changes.find((change) => change.key === 'dispatchPhoneNumber')
  if (dispatchPhone) {
    parts.push(
      dispatchPhone.to === EMPTY_SHOWN
        ? 'Riders no longer see a Call dispatch button.'
        : 'Riders see the Call dispatch button within ten minutes.',
    )
  }
  return parts.join(' ')
}
