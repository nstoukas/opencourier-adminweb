import { featureCollection } from '@turf/turf'
import type { TFunction } from 'i18next'
import type { ChatPreset } from '@/backend-admin-sdk/src/models/InstanceConfigSettingsDto'
import { formatMoney } from '@/i18n/format'
import type { Language } from '@/i18n/language'
import { parseQuoteRateInput } from '@/utils/quoteRate'

/**
 * The co-op settings page's save bar (spec 0010): what the boxes hold, how each setting is
 * compared with its saved value and shown as "old → new", what stops Save, and what Save sends.
 * Plain functions with no React, so each rule can be tested on its own.
 *
 * Words (spec 0054): a function that returns words a person reads takes `t` first, the function
 * useTranslation gives a component, and the reader's language where money or a preset is shown. The page
 * calls them while it draws, so a language switch rewords the bar at once.
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
  // Row 144: minutes a rider who declined or missed an offer is skipped for that delivery.
  offerSkipMinutes: string
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
  // Chat (spec 0034, AC-13 and AC-18): each preset list as typed, and the days messages are kept. Since
  // spec 0054 (AC-7) a preset is a pair, its Greek and its English, each box holding the text typed.
  chatQuickRepliesDispatch: ChatPreset[]
  chatQuickRepliesCourier: ChatPreset[]
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
  // Row 147: minutes a declined or missed pair stays apart; 0 means no block.
  stackPairBlockMinutes: string
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
  | 'presets' // a list of { el, en } pairs, sent trimmed, with rows left empty in both languages dropped

// `labelKey` is the translation key of the setting's name (spec 0054), looked up when the bar or a box
// is drawn, so the name follows the reader's language.
export type SettingDefinition = { key: SettingKey; labelKey: string; kind: Kind; details?: boolean }

// Every setting the bar covers, in page order, with the key of the name the bar shows. The details ones
// live inside the backend's `details` object, which is replaced whole (spec 0010, AC-12).
export const SETTINGS: SettingDefinition[] = [
  { key: 'quoteBaseFee', labelKey: 'settings.labels.quoteBaseFee', kind: 'cents' },
  { key: 'quoteRatePerDistanceUnit', labelKey: 'settings.labels.quoteRatePerDistanceUnit', kind: 'cents' },
  { key: 'feePercentageAmount', labelKey: 'settings.labels.feePercentageAmount', kind: 'number' },
  { key: 'feePercentageCeiling', labelKey: 'settings.labels.feePercentageCeiling', kind: 'number' },
  { key: 'currency', labelKey: 'settings.labels.currency', kind: 'select' },
  { key: 'distanceUnit', labelKey: 'settings.labels.distanceUnit', kind: 'select' },
  { key: 'quoteCalculationType', labelKey: 'settings.labels.quoteCalculationType', kind: 'select' },
  { key: 'courierMatcherType', labelKey: 'settings.labels.courierMatcherType', kind: 'select' },
  { key: 'maxAssignmentDistance', labelKey: 'settings.labels.maxAssignmentDistance', kind: 'number' },
  { key: 'maxDriftDistance', labelKey: 'settings.labels.maxDriftDistance', kind: 'number' },
  { key: 'arrivalRadiusMetres', labelKey: 'settings.labels.arrivalRadiusMetres', kind: 'number' },
  { key: 'quoteExpirationMinutes', labelKey: 'settings.labels.quoteExpirationMinutes', kind: 'number' },
  { key: 'geoCalculationType', labelKey: 'settings.labels.geoCalculationType', kind: 'select' },
  { key: 'deliveryDurationCalculationType', labelKey: 'settings.labels.deliveryDurationCalculationType', kind: 'select' },
  { key: 'offerExpiryEnabled', labelKey: 'settings.labels.offerExpiryEnabled', kind: 'switch' },
  { key: 'offerExpirySeconds', labelKey: 'settings.labels.offerExpirySeconds', kind: 'number' },
  { key: 'noCourierRetrySeconds', labelKey: 'settings.labels.noCourierRetrySeconds', kind: 'number' },
  { key: 'offerTimingEnabled', labelKey: 'settings.labels.offerTimingEnabled', kind: 'switch' },
  { key: 'offerLeadMinutes', labelKey: 'settings.labels.offerLeadMinutes', kind: 'number' },
  { key: 'offerTimingCandidates', labelKey: 'settings.labels.offerTimingCandidates', kind: 'number' },
  { key: 'handBackSeconds', labelKey: 'settings.labels.handBackSeconds', kind: 'number' },
  { key: 'offerSkipMinutes', labelKey: 'settings.labels.offerSkipMinutes', kind: 'number' },
  { key: 'cancellationPayoutPolicy', labelKey: 'settings.labels.cancellationPayoutPolicy', kind: 'select' },
  { key: 'defaultCourierPayRate', labelKey: 'settings.labels.defaultCourierPayRate', kind: 'number' },
  { key: 'defaultMaxWorkingHours', labelKey: 'settings.labels.defaultMaxWorkingHours', kind: 'number' },
  { key: 'courierCompensationCalculationType', labelKey: 'settings.labels.courierCompensationCalculationType', kind: 'select' },
  { key: 'returnTripPayPercent', labelKey: 'settings.labels.returnTripPayPercent', kind: 'number' },
  { key: 'waitPayEnabled', labelKey: 'settings.labels.waitPayEnabled', kind: 'switch' },
  { key: 'waitPayFreeMinutes', labelKey: 'settings.labels.waitPayFreeMinutes', kind: 'number' },
  { key: 'waitPayCentsPerMinute', labelKey: 'settings.labels.waitPayCentsPerMinute', kind: 'number' },
  { key: 'waitLimitMinutes', labelKey: 'settings.labels.waitLimitMinutes', kind: 'number' },
  { key: 'splitAnswerMinutes', labelKey: 'settings.labels.splitAnswerMinutes', kind: 'number' },
  { key: 'shiftsEnabled', labelKey: 'settings.labels.shiftsEnabled', kind: 'switch' },
  { key: 'shiftDropNoticeHours', labelKey: 'settings.labels.shiftDropNoticeHours', kind: 'number' },
  { key: 'shiftBreakMinutes', labelKey: 'settings.labels.shiftBreakMinutes', kind: 'number' },
  { key: 'region', labelKey: 'settings.labels.region', kind: 'region', details: true },
  { key: 'name', labelKey: 'settings.labels.name', kind: 'text', details: true },
  { key: 'link', labelKey: 'settings.labels.link', kind: 'url', details: true },
  { key: 'websocketLink', labelKey: 'settings.labels.websocketLink', kind: 'url', details: true },
  { key: 'imageUrl', labelKey: 'settings.labels.imageUrl', kind: 'url', details: true },
  { key: 'defaultDietaryRestrictions', labelKey: 'settings.labels.defaultDietaryRestrictions', kind: 'multi' },
  { key: 'savedCustomerRetentionMonths', labelKey: 'settings.labels.savedCustomerRetentionMonths', kind: 'number' },
  { key: 'restaurantHistoryDays', labelKey: 'settings.labels.restaurantHistoryDays', kind: 'number' },
  { key: 'sosLocationRetentionDays', labelKey: 'settings.labels.sosLocationRetentionDays', kind: 'number' },
  { key: 'dispatchPhoneNumber', labelKey: 'settings.labels.dispatchPhoneNumber', kind: 'phone' },
  // Chat (spec 0034).
  { key: 'chatQuickRepliesDispatch', labelKey: 'settings.labels.chatQuickRepliesDispatch', kind: 'presets' },
  { key: 'chatQuickRepliesCourier', labelKey: 'settings.labels.chatQuickRepliesCourier', kind: 'presets' },
  { key: 'chatRetentionDays', labelKey: 'settings.labels.chatRetentionDays', kind: 'number' },
  // Address notes (spec 0053, AC-6).
  { key: 'addressNoteRetentionDays', labelKey: 'settings.labels.addressNoteRetentionDays', kind: 'number' },
  // Review requests (spec 0038).
  { key: 'reviewAnswerDays', labelKey: 'settings.labels.reviewAnswerDays', kind: 'number' },
  { key: 'reviewCorrectionMaxCents', labelKey: 'settings.labels.reviewCorrectionMaxCents', kind: 'number' },
  // Box model (spec 0043, AC-2, AC-8).
  { key: 'boxUnitsSmall', labelKey: 'settings.labels.boxUnitsSmall', kind: 'number' },
  { key: 'boxUnitsMedium', labelKey: 'settings.labels.boxUnitsMedium', kind: 'number' },
  { key: 'boxUnitsLarge', labelKey: 'settings.labels.boxUnitsLarge', kind: 'number' },
  { key: 'boxDefaultSize', labelKey: 'settings.labels.boxDefaultSize', kind: 'select' },
  // Fairness matcher (spec 0044, AC-5).
  { key: 'fairnessWeightRoadTime', labelKey: 'settings.labels.fairnessWeightRoadTime', kind: 'number' },
  { key: 'fairnessWeightEarnings', labelKey: 'settings.labels.fairnessWeightEarnings', kind: 'number' },
  { key: 'fairnessWeightWaiting', labelKey: 'settings.labels.fairnessWeightWaiting', kind: 'number' },
  { key: 'fairnessWeightShift', labelKey: 'settings.labels.fairnessWeightShift', kind: 'number' },
  { key: 'fairnessCandidateLimit', labelKey: 'settings.labels.fairnessCandidateLimit', kind: 'number' },
  { key: 'fairnessMinOnlineMinutes', labelKey: 'settings.labels.fairnessMinOnlineMinutes', kind: 'number' },
  // Two orders at once (spec 0048, AC-1).
  { key: 'stackingEnabled', labelKey: 'settings.labels.stackingEnabled', kind: 'switch' },
  { key: 'twoOrderPolicy', labelKey: 'settings.labels.twoOrderPolicy', kind: 'select' },
  { key: 'twoOrderDelayLimitMinutes', labelKey: 'settings.labels.twoOrderDelayLimitMinutes', kind: 'number' },
  { key: 'stackPairBlockMinutes', labelKey: 'settings.labels.stackPairBlockMinutes', kind: 'number' },
  { key: 'addOnOffersEnabled', labelKey: 'settings.labels.addOnOffersEnabled', kind: 'switch' },
  { key: 'addOnMoment', labelKey: 'settings.labels.addOnMoment', kind: 'select' },
]

// The words for a setting, shared by its box and the bar (row 87 review), in the reader's language.
// The rate follows the distance unit in the boxes.
export function labelOf(t: TFunction, key: SettingKey, form?: Pick<SettingsForm, 'distanceUnit'>): string {
  if (key === 'quoteRatePerDistanceUnit' && form?.distanceUnit === 'MILES') {
    return t('settings.labels.quoteRatePerMile')
  }
  const definition = SETTINGS.find((candidate) => candidate.key === key)
  return definition ? t(definition.labelKey) : key
}

// A preset list as the backend sent it, as the page's boxes hold it (spec 0054, AC-7). A plain text, from
// before the backend kept pairs, is the Greek one with an empty English box to fill.
export function presetsOf(value: unknown): ChatPreset[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    if (typeof entry === 'string') return { el: entry, en: '' }
    const pair = (entry ?? {}) as { el?: unknown; en?: unknown }
    return {
      el: typeof pair.el === 'string' ? pair.el : '',
      en: typeof pair.en === 'string' ? pair.en : '',
    }
  })
}

// A preset list as it is saved: each text trimmed, a row empty in both languages dropped (as a blank
// line was before spec 0054).
export function cleanPresets(rows: ChatPreset[] | null | undefined): ChatPreset[] {
  return (rows ?? [])
    .map((row) => ({ el: row.el.trim(), en: row.en.trim() }))
    .filter((row) => row.el !== '' || row.en !== '')
}

// One preset in the reader's language, else the other one (the same rule as the backend's chatPresetText).
export function presetText(preset: ChatPreset, language: Language): string {
  return language === 'en' ? preset.en || preset.el : preset.el || preset.en
}

// The rows (by index) that miss their Greek or their English and must have both: a row that is new or
// edited (spec 0054, AC-7). A row the backend already holds exactly so (an old one, Greek only) may stay
// as it is until someone edits it. Rows empty in both languages are dropped on save, so never listed.
export function incompletePresetRows(rows: ChatPreset[], savedRows: ChatPreset[] | null | undefined): number[] {
  const saved = cleanPresets(savedRows)
  const found: number[] = []
  rows.forEach((row, index) => {
    const el = row.el.trim()
    const en = row.en.trim()
    if (el === '' && en === '') return
    if (el !== '' && en !== '') return
    const untouched = saved.some((old) => old.el === el && old.en === en)
    if (!untouched) found.push(index)
  })
  return found
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
    case 'presets':
      return JSON.stringify(cleanPresets(value as ChatPreset[] | undefined))
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

// The key of how an empty box reads in the bar; successMessage also reads it to tell a cleared number
// (review nit).
export const EMPTY_SHOWN_KEY = 'settings.bar.empty'

// How a value reads in the bar, in the reader's language. `optionLabel` turns an option's code into its words.
function shown(
  t: TFunction,
  language: Language,
  definition: SettingDefinition,
  value: unknown,
  currency: string,
  optionLabel: (key: SettingKey, option: string) => string,
): string {
  if (definition.kind === 'region') return ''
  if (definition.kind === 'presets') {
    const list = cleanPresets(value as ChatPreset[] | undefined)
    return list.length ? list.map((preset) => presetText(preset, language)).join(' · ') : t('settings.bar.none')
  }
  if (definition.kind === 'switch') {
    return value === true ? t('settings.bar.on') : value === false ? t('settings.bar.off') : t('common.dash')
  }
  if (definition.kind === 'multi') {
    const list = (value as string[] | undefined) ?? []
    return list.length ? list.map((option) => optionLabel(definition.key, option)).join(', ') : t('settings.bar.none')
  }
  const text = definition.kind === 'url' ? sanitizeURL(String(value ?? '')) : String(value ?? '').trim()
  if (text === '') return t(EMPTY_SHOWN_KEY)
  if (definition.kind === 'select') return optionLabel(definition.key, text)
  if (definition.kind === 'cents') {
    const cents = parseQuoteRateInput(text)
    return cents === null ? text : formatMoney(cents, currency, language)
  }
  return text
}

// Every setting whose box differs from its saved value, in page order. Nothing is counted
// before the settings load (`saved` is null): null to null is not a change (AC-13).
export function pendingChanges(
  t: TFunction,
  language: Language,
  saved: SettingsForm | null,
  edited: SettingsForm,
  optionLabel: (key: SettingKey, option: string) => string = (_key, option) => option,
): PendingChange[] {
  if (saved === null) return []
  return SETTINGS.filter(
    (definition) => comparable(definition, saved[definition.key]) !== comparable(definition, edited[definition.key]),
  ).map((definition) => ({
    key: definition.key,
    label: labelOf(t, definition.key, edited),
    // Money shows in the currency it was saved in, and the new value in the one being saved.
    from: shown(t, language, definition, saved[definition.key], saved.currency, optionLabel),
    to: shown(t, language, definition, edited[definition.key], edited.currency, optionLabel),
  }))
}

// One wording for a bad link, in the box and in the bar (row 87 review).
export const urlErrorText = (t: TFunction, label: string) => t('settings.blockers.invalidUrl', { label })

export const CENTS_ERROR = (t: TFunction, label: string) => t('settings.blockers.cents', { label })

// Every reason Save is off, in words the bar shows (AC-14). Only changed settings are checked:
// an untouched one keeps its saved value and is not sent. The required details are checked
// whenever any detail changed, because `details` is then sent whole. `saved` tells an old preset
// kept as it was from a new or edited one (spec 0054); without it every preset row is checked.
export function blockers(
  t: TFunction,
  changes: PendingChange[],
  edited: SettingsForm,
  saved: SettingsForm | null = null,
): string[] {
  const changed = new Set(changes.map((change) => change.key))
  const found: string[] = []
  const detailsChanged = SETTINGS.some((definition) => definition.details && changed.has(definition.key))
  if (detailsChanged) {
    if (edited.name.trim() === '') found.push(t('settings.blockers.nameEmpty'))
    if (edited.link.trim() === '') found.push(t('settings.blockers.urlEmpty'))
    if (edited.region == null) found.push(t('settings.blockers.areaNotDrawn'))
  }
  for (const definition of SETTINGS) {
    if (!changed.has(definition.key)) continue
    const value = edited[definition.key]
    const label = labelOf(t, definition.key, edited)
    if (definition.kind === 'url' && !isValidURL(sanitizeURL(String(value ?? '')))) {
      found.push(urlErrorText(t, label))
    }
    if (definition.kind === 'multi' && ((value as string[] | undefined) ?? []).length === 0) {
      found.push(t('settings.blockers.nothingSelected', { label }))
    }
    if (definition.kind === 'cents' && parseQuoteRateInput(String(value ?? '')) === null) {
      found.push(CENTS_ERROR(t, label))
    }
    if (definition.kind === 'number' && String(value ?? '').trim() === '') {
      found.push(t('settings.blockers.empty', { label }))
    }
    if (definition.kind === 'presets') {
      const rows = (value as ChatPreset[] | undefined) ?? []
      const list = cleanPresets(rows)
      if (list.length > QUICK_REPLIES_MAX_ENTRIES) {
        found.push(t('settings.blockers.presetsTooMany', { label, max: QUICK_REPLIES_MAX_ENTRIES }))
      }
      if (list.some((preset) => preset.el.length > QUICK_REPLY_MAX_LENGTH || preset.en.length > QUICK_REPLY_MAX_LENGTH)) {
        found.push(t('settings.blockers.presetsTooLong', { label, max: QUICK_REPLY_MAX_LENGTH }))
      }
      const savedRows = saved ? (saved[definition.key] as ChatPreset[]) : null
      if (incompletePresetRows(rows, savedRows).length > 0) {
        found.push(t('settings.blockers.presetsIncomplete', { label }))
      }
    }
  }
  // Spec 0041 (AC-8): the fee may not end above the ceiling. Checked when either changed, with the
  // values the save would leave in effect; the backend checks the same and has the last word.
  if (changed.has('feePercentageAmount') || changed.has('feePercentageCeiling')) {
    const fee = feeAboveCeiling(edited)
    if (fee) {
      found.push(
        t('settings.blockers.feeAboveCeiling', {
          label: labelOf(t, 'feePercentageAmount'),
          fee: fee.fee,
          ceiling: fee.ceiling,
        }),
      )
    }
  }
  // Spec 0043 (AC-2): Small may not take more room than Medium, nor Medium more than Large, with the
  // values the save would leave in effect. The backend checks the same and has the last word.
  if (changed.has('boxUnitsSmall') || changed.has('boxUnitsMedium') || changed.has('boxUnitsLarge')) {
    const order = boxUnitsOutOfOrder(t, edited)
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
        t('settings.blockers.weightsAllZero', {
          roadTime: labelOf(t, 'fairnessWeightRoadTime'),
          earnings: labelOf(t, 'fairnessWeightEarnings'),
          waiting: labelOf(t, 'fairnessWeightWaiting'),
        }),
      )
    }
  }
  return found
}

// Spec 0043: the sentence when the three sizes' units are out of order, else null. Empty or non
// number boxes are left to the "is empty" check and the backend.
export function boxUnitsOutOfOrder(
  t: TFunction,
  form: Pick<SettingsForm, 'boxUnitsSmall' | 'boxUnitsMedium' | 'boxUnitsLarge'>,
): string | null {
  const small = Number(form.boxUnitsSmall.trim())
  const medium = Number(form.boxUnitsMedium.trim())
  const large = Number(form.boxUnitsLarge.trim())
  const known = (text: string, value: number) => text.trim() !== '' && Number.isFinite(value)
  if (known(form.boxUnitsSmall, small) && known(form.boxUnitsMedium, medium) && small > medium) {
    return t('settings.blockers.smallAboveMedium', { small, medium })
  }
  if (known(form.boxUnitsMedium, medium) && known(form.boxUnitsLarge, large) && medium > large) {
    return t('settings.blockers.mediumAboveLarge', { medium, large })
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
    } else if (definition.kind === 'presets') {
      // Always pairs (spec 0054, AC-7): the backend reads `{ el, en }`.
      payload[definition.key] = cleanPresets(value as ChatPreset[])
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
    offerSkipMinutes: text(data.offerSkipMinutes),
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
    chatQuickRepliesDispatch: presetsOf(data.chatQuickRepliesDispatch),
    chatQuickRepliesCourier: presetsOf(data.chatQuickRepliesCourier),
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
    stackPairBlockMinutes: text(data.stackPairBlockMinutes),
    addOnOffersEnabled: data.addOnOffersEnabled ?? null,
    addOnMoment: data.addOnMoment ?? '',
  }
}

// The boxes before anything loads: all empty, the switch unknown.
export const EMPTY_FORM: SettingsForm = formFromSettings({})

// The success words (AC-15): what was saved, plus today's sentence for a setting that has one.
export function successMessage(t: TFunction, changes: PendingChange[]): string {
  const keys = new Set(changes.map((change) => change.key))
  const parts = [t('settings.success.saved', { labels: changes.map((change) => change.label).join(', ') })]
  if (keys.has('quoteBaseFee') || keys.has('quoteRatePerDistanceUnit') || keys.has('feePercentageAmount')) {
    parts.push(t('settings.success.pricing'))
  }
  if (keys.has('offerExpiryEnabled') || keys.has('offerExpirySeconds') || keys.has('noCourierRetrySeconds')) {
    parts.push(t('settings.success.offers'))
  }
  if (keys.has('offerTimingEnabled') || keys.has('offerLeadMinutes') || keys.has('offerTimingCandidates')) {
    parts.push(t('settings.success.timedOffers'))
  }
  if (
    keys.has('waitPayEnabled') ||
    keys.has('waitPayFreeMinutes') ||
    keys.has('waitPayCentsPerMinute') ||
    keys.has('waitLimitMinutes')
  ) {
    parts.push(t('settings.success.delays'))
  }
  if (keys.has('arrivalRadiusMetres')) {
    parts.push(t('settings.success.arrival'))
  }
  if (keys.has('shiftsEnabled') || keys.has('shiftDropNoticeHours')) {
    parts.push(t('settings.success.shifts'))
  }
  if (keys.has('shiftBreakMinutes')) {
    parts.push(t('settings.success.shiftBreak'))
  }
  if (keys.has('handBackSeconds')) {
    parts.push(t('settings.success.handBack'))
  }
  if (keys.has('offerSkipMinutes')) {
    parts.push(t('settings.success.offerSkip'))
  }
  if (keys.has('cancellationPayoutPolicy')) {
    parts.push(t('settings.success.cancellation'))
  }
  if (keys.has('returnTripPayPercent')) {
    parts.push(t('settings.success.returnTrip'))
  }
  if (keys.has('savedCustomerRetentionMonths')) {
    parts.push(t('settings.success.savedCustomers'))
  }
  if (keys.has('restaurantHistoryDays')) {
    parts.push(t('settings.success.history'))
  }
  if (keys.has('sosLocationRetentionDays')) {
    parts.push(t('settings.success.sos'))
  }
  if (keys.has('chatQuickRepliesDispatch') || keys.has('chatQuickRepliesCourier')) {
    parts.push(t('settings.success.presets'))
  }
  if (keys.has('chatRetentionDays')) {
    parts.push(t('settings.success.chatRetention'))
  }
  if (keys.has('addressNoteRetentionDays')) {
    parts.push(t('settings.success.addressNotes'))
  }
  if (
    keys.has('stackingEnabled') ||
    keys.has('twoOrderPolicy') ||
    keys.has('twoOrderDelayLimitMinutes') ||
    keys.has('stackPairBlockMinutes') ||
    keys.has('addOnOffersEnabled') ||
    keys.has('addOnMoment')
  ) {
    // Review fix (row 81): an add on change is named as such, not only as "two orders together".
    const addOn = keys.has('addOnOffersEnabled') || keys.has('addOnMoment')
    const stack =
      keys.has('stackingEnabled') ||
      keys.has('twoOrderPolicy') ||
      keys.has('twoOrderDelayLimitMinutes') ||
      keys.has('stackPairBlockMinutes')
    const what = t(
      addOn && stack ? 'settings.success.stackAndAddOn' : addOn ? 'settings.success.addOn' : 'settings.success.stack',
    )
    parts.push(t('settings.success.stackApplies', { what }))
  }
  if (keys.has('boxUnitsSmall') || keys.has('boxUnitsMedium') || keys.has('boxUnitsLarge')) {
    parts.push(t('settings.success.boxUnits'))
  }
  if (
    keys.has('fairnessWeightRoadTime') ||
    keys.has('fairnessWeightEarnings') ||
    keys.has('fairnessWeightWaiting') ||
    keys.has('fairnessWeightShift') ||
    keys.has('fairnessCandidateLimit') ||
    keys.has('fairnessMinOnlineMinutes')
  ) {
    parts.push(t('settings.success.fairness'))
  }
  if (keys.has('boxDefaultSize')) {
    parts.push(t('settings.success.defaultSize'))
  }
  if (keys.has('reviewAnswerDays')) {
    parts.push(t('settings.success.reviewDays'))
  }
  if (keys.has('reviewCorrectionMaxCents')) {
    parts.push(t('settings.success.reviewMax'))
  }
  const dispatchPhone = changes.find((change) => change.key === 'dispatchPhoneNumber')
  if (dispatchPhone) {
    // `to` was worded with the same t, so an emptied number reads as the same "(empty)" words.
    parts.push(t(dispatchPhone.to === t(EMPTY_SHOWN_KEY) ? 'settings.success.phoneCleared' : 'settings.success.phoneSet'))
  }
  return parts.join(' ')
}
