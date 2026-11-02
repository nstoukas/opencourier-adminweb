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
  maxAssignmentDistance: string
  maxDriftDistance: string
  quoteExpirationMinutes: string
  defaultCourierPayRate: string
  defaultMaxWorkingHours: string
  offerExpiryEnabled: boolean | null
  offerExpirySeconds: string
  noCourierRetrySeconds: string
  handBackSeconds: string
  cancellationPayoutPolicy: string
  savedCustomerRetentionMonths: string
  restaurantHistoryDays: string
  dispatchPhoneNumber: string
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

export type SettingDefinition = { key: SettingKey; label: string; kind: Kind; details?: boolean }

// Every setting the bar covers, in page order, with the label the bar shows. The details ones
// live inside the backend's `details` object, which is replaced whole (spec 0010, AC-12).
export const SETTINGS: SettingDefinition[] = [
  { key: 'quoteBaseFee', label: 'Base fee', kind: 'cents' },
  { key: 'quoteRatePerDistanceUnit', label: 'Rate per km', kind: 'cents' },
  { key: 'feePercentageAmount', label: 'Co-op fee (%)', kind: 'number' },
  { key: 'currency', label: 'Currency', kind: 'select' },
  { key: 'distanceUnit', label: 'Distance unit', kind: 'select' },
  { key: 'quoteCalculationType', label: 'Quote calculation', kind: 'select' },
  { key: 'courierMatcherType', label: 'Who gets the offer first', kind: 'select' },
  { key: 'maxAssignmentDistance', label: 'Furthest courier to offer', kind: 'number' },
  { key: 'maxDriftDistance', label: 'Max drift distance', kind: 'number' },
  { key: 'quoteExpirationMinutes', label: 'Quote stays valid for', kind: 'number' },
  { key: 'geoCalculationType', label: 'Measure distance by', kind: 'select' },
  { key: 'deliveryDurationCalculationType', label: 'Delivery duration calculation', kind: 'select' },
  { key: 'offerExpiryEnabled', label: 'Offer expiry', kind: 'switch' },
  { key: 'offerExpirySeconds', label: 'Seconds before an unanswered offer ends', kind: 'number' },
  { key: 'noCourierRetrySeconds', label: 'Seconds between retries when no rider is free', kind: 'number' },
  { key: 'handBackSeconds', label: 'Seconds a rider can hand back an order for free', kind: 'number' },
  { key: 'cancellationPayoutPolicy', label: 'Pay when a job is cancelled', kind: 'select' },
  { key: 'defaultCourierPayRate', label: 'Default courier pay rate', kind: 'number' },
  { key: 'defaultMaxWorkingHours', label: 'Default max working hours', kind: 'number' },
  { key: 'courierCompensationCalculationType', label: 'Courier compensation calculation', kind: 'select' },
  { key: 'region', label: 'Service area', kind: 'region', details: true },
  { key: 'name', label: 'Name', kind: 'text', details: true },
  { key: 'link', label: 'URL', kind: 'url', details: true },
  { key: 'websocketLink', label: 'Websocket URL', kind: 'url', details: true },
  { key: 'imageUrl', label: 'Logo image URL', kind: 'url', details: true },
  { key: 'defaultDietaryRestrictions', label: 'Default dietary restrictions', kind: 'multi' },
  { key: 'savedCustomerRetentionMonths', label: 'Saved customer retention (months)', kind: 'number' },
  { key: 'restaurantHistoryDays', label: 'Restaurant order history (days)', kind: 'number' },
  { key: 'dispatchPhoneNumber', label: 'Dispatch phone number', kind: 'phone' },
]

// The words for a setting, shared by its box and the bar (row 87 review). The rate follows the
// distance unit in the boxes.
export function labelOf(key: SettingKey, form?: Pick<SettingsForm, 'distanceUnit'>): string {
  if (key === 'quoteRatePerDistanceUnit') {
    return form?.distanceUnit === 'MILES' ? 'Rate per mile' : 'Rate per km'
  }
  return SETTINGS.find((definition) => definition.key === key)?.label ?? key
}


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

// How a value reads in the bar. `optionLabel` turns an option's code into its words.
function shown(
  definition: SettingDefinition,
  value: unknown,
  currency: string,
  optionLabel: (key: SettingKey, option: string) => string,
): string {
  if (definition.kind === 'region') return ''
  if (definition.kind === 'switch') return value === true ? 'On' : value === false ? 'Off' : '—'
  if (definition.kind === 'multi') {
    const list = (value as string[] | undefined) ?? []
    return list.length ? list.map((option) => optionLabel(definition.key, option)).join(', ') : '(none)'
  }
  const text = definition.kind === 'url' ? sanitizeURL(String(value ?? '')) : String(value ?? '').trim()
  if (text === '') return '(empty)'
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
  }
  return found
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
    maxAssignmentDistance: text(data.maxAssignmentDistance),
    maxDriftDistance: text(data.maxDriftDistance),
    quoteExpirationMinutes: text(data.quoteExpirationMinutes),
    defaultCourierPayRate: text(data.defaultCourierPayRate),
    defaultMaxWorkingHours: text(data.defaultMaxWorkingHours),
    offerExpiryEnabled: data.offerExpiryEnabled ?? null,
    offerExpirySeconds: text(data.offerExpirySeconds),
    noCourierRetrySeconds: text(data.noCourierRetrySeconds),
    handBackSeconds: text(data.handBackSeconds),
    // The backend answers the rule in force, FULL_COMPENSATION when none is stored (spec 0015).
    // Before the settings load it is empty, like every other select.
    cancellationPayoutPolicy: data.cancellationPayoutPolicy ?? '',
    savedCustomerRetentionMonths: text(data.savedCustomerRetentionMonths),
    restaurantHistoryDays: text(data.restaurantHistoryDays),
    dispatchPhoneNumber: data.dispatchPhoneNumber ?? '',
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
  if (keys.has('handBackSeconds')) {
    parts.push('The hand back applies to the next accept; a running hand back keeps its end.')
  }
  if (keys.has('cancellationPayoutPolicy')) {
    parts.push('Cancelled job pay applies to cancellations from now on.')
  }
  if (keys.has('savedCustomerRetentionMonths')) {
    parts.push('The daily job uses the retention from its next run.')
  }
  if (keys.has('restaurantHistoryDays')) {
    parts.push('Restaurants see the new order history period at once.')
  }
  const dispatchPhone = changes.find((change) => change.key === 'dispatchPhoneNumber')
  if (dispatchPhone) {
    parts.push(
      dispatchPhone.to === '(empty)'
        ? 'Riders no longer see a Call dispatch button.'
        : 'Riders see the Call dispatch button within ten minutes.',
    )
  }
  return parts.join(' ')
}
