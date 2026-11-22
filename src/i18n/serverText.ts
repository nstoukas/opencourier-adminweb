// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE SERVER'S WORDS, in the reader's language (spec 0054, AC-4 and AC-6).
//
// The backend sends two kinds of text this file turns into a sentence:
//   1. a delivery record line: `messageCode` plus `messageParams` (src/shared-types/event-messages.ts),
//      rendered from `server.event.<code>` in the language files;
//   2. a refusal: an error `code` (and `params` when it has numbers), rendered from `server.error.<code>`.
// The templates are the backend's own (resources/en/server.ts is a copy of its en.ts), in the subset of
// i18next syntax the backend's own renderer reads (its src/localization/translate.ts):
//   {{name}}            the value
//   {{name, clock}}     an ISO time shown as HH:mm on Greek time
//   {{name, list}}      a list of parts, "a, b and c" (Greek "a, b και c")
//   {{name, comma}}     a list of parts joined with ", "
//   {{name, money}}     cents, with the sibling `currency` value, as the language writes money ("3,50 €")
//   {{name, decimal}}   a number with the language's decimal mark, at most one decimal ("1,2")
//   {{name, day}}       an ISO time's day on Greek time, seen from now: "today", "tomorrow", "on 3 August"
//   {{name, when}}      an ISO time as HH:mm, and its day when that is not today ("09:00 tomorrow")
//   $t(server.enum.x.{{name}})   another key, looked up after the value is filled in
// A value can be a "part" ({ part, params }) or a list of parts: each is rendered first, from
// `server.eventPart.<part>`. This file renders exactly as the backend does, line for line (decision
// 47.31), rather than leaning on i18next's own interpolation, whose nesting and array handling differ.
// ─────────────────────────────────────────────────────────────────────────────────────────────
import type { i18n as I18n } from 'i18next'
import type { EventMessageParams, EventParamValue, EventPart } from '@/shared-types/event-messages'
import { formatMoney, formatNumber, formatTime, TIME_ZONE } from './format'
import { LOCALES, toLanguage, type Language } from './language'

// Each language's word for the last "and" of a list (no comma before it in either), as the backend has it.
const LIST_AND: Record<Language, string> = { el: 'και', en: 'and' }

// Each language's words for a day seen from today, as the backend's renderer has them.
const DAY_WORDS: Record<Language, { today: string; tomorrow: string; on: string }> = {
  el: { today: 'σήμερα', tomorrow: 'αύριο', on: 'στις' },
  en: { today: 'today', tomorrow: 'tomorrow', on: 'on' },
}

// The YYYY-MM-DD day of an instant on Greek time ('en-CA' writes dates in that order).
function greekDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date)
}

// "today", "tomorrow", or "on 3 August" (Greek "στις 3 Αυγούστου"), seen from now on Greek time.
function dayText(language: Language, date: Date): string {
  const words = DAY_WORDS[language]
  const now = new Date()
  if (greekDay(date) === greekDay(now)) return words.today
  // Noon plus a day lands on tomorrow's date whatever the clock change does.
  const tomorrow = new Date(`${greekDay(now)}T12:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (greekDay(date) === tomorrow.toISOString().slice(0, 10)) return words.tomorrow
  const dayMonth = new Intl.DateTimeFormat(LOCALES[language], { day: 'numeric', month: 'long', timeZone: TIME_ZONE })
  return `${words.on} ${dayMonth.format(date)}`
}

function listOf(language: Language, texts: string[]): string {
  if (texts.length <= 1) return texts.join('')
  return `${texts.slice(0, -1).join(', ')} ${LIST_AND[language]} ${texts[texts.length - 1]}`
}

// The raw template of `key` in a language, or null. getResource reads the texts as stored, before
// i18next fills anything in.
function lookup(i18n: I18n, language: Language, key: string): string | null {
  const value: unknown = i18n.getResource(language, 'translation', key)
  return typeof value === 'string' ? value : null
}

// A type predicate: inside `if (isPart(value))` TypeScript knows the value is an EventPart.
function isPart(value: EventParamValue): value is EventPart {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatValue(
  i18n: I18n,
  language: Language,
  value: EventParamValue | undefined,
  format: string | undefined,
  params: EventMessageParams,
): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) {
    const texts = value.map((part) => render(i18n, language, `server.eventPart.${part.part}`, part.params))
    if (format === 'list') return listOf(language, texts)
    if (format === 'comma') return texts.join(', ')
    return texts.join('')
  }
  if (isPart(value)) return render(i18n, language, `server.eventPart.${value.part}`, value.params)
  if (format === 'clock' && typeof value === 'string') {
    const time = formatTime(value, language)
    return time === '—' ? value : time
  }
  if ((format === 'day' || format === 'when') && typeof value === 'string') {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    const day = dayText(language, date)
    if (format === 'day') return day
    const time = formatTime(value, language)
    return day === DAY_WORDS[language].today ? time : `${time} ${day}`
  }
  if (format === 'money' && typeof value === 'number') {
    return formatMoney(value, typeof params.currency === 'string' ? params.currency : 'EUR', language)
  }
  if (format === 'decimal' && typeof value === 'number') return formatNumber(value, language, 1)
  return String(value)
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*(?:,\s*(\w+)\s*)?\}\}/g

function render(i18n: I18n, language: Language, key: string, params: EventMessageParams): string {
  const template = lookup(i18n, language, key) ?? lookup(i18n, 'en', key)
  if (template === null) return key
  const fill = (text: string) =>
    text.replace(PLACEHOLDER, (_match, name: string, format?: string) =>
      formatValue(i18n, language, params[name], format, params),
    )
  // Nested keys first, filling only the placeholders inside the key, so a value (an admin's note, say)
  // is never read as a key itself.
  const nested = template.replace(/\$t\(([^)]*)\)/g, (_match, nestedKey: string) => {
    const resolved = fill(nestedKey)
    return lookup(i18n, language, resolved) ?? lookup(i18n, 'en', resolved) ?? resolved
  })
  return fill(nested)
}

/** Whether the language files have a text for this server key (`server.event.X`, `server.error.Y`). */
export function hasServerText(i18n: I18n, key: string): boolean {
  return lookup(i18n, 'en', key) !== null
}

/** The text of a server key in the reader's language, with its values filled in. */
export function renderServerText(i18n: I18n, key: string, params: EventMessageParams = {}): string {
  return render(i18n, toLanguage(i18n.language), key, params)
}

// ── Delivery record lines (AC-4) ─────────────────────────────────────────────────────────────

/** The parts of a delivery event this needs (the SDK's DeliveryEventAdminDto has them all). */
export interface StoredEventText {
  message: string | null
  messageCode?: string | null
  messageParams?: EventMessageParams | null
  eventSource?: string | null
}

/**
 * What a record line says, in the reader's language:
 * - with a code this app knows: the sentence rendered from it;
 * - with no code (a row from before row 47), or a code newer than this copy: the English stored in
 *   `message`, with `recordedInEnglish` so the page can say so;
 * - written by a partner integration (eventSource other than OPENCOURIER) with no code: its stored text
 *   as it is, with no note, since those are the partner's own words (cross check 5).
 * `text` is null when the event has no message at all.
 */
export function eventMessageText(
  i18n: I18n,
  event: StoredEventText,
): { text: string | null; recordedInEnglish: boolean } {
  const code = event.messageCode
  if (code && hasServerText(i18n, `server.event.${code}`)) {
    return { text: renderServerText(i18n, `server.event.${code}`, event.messageParams ?? {}), recordedInEnglish: false }
  }
  if (!event.message) return { text: null, recordedInEnglish: false }
  const fromPartner = !code && event.eventSource != null && event.eventSource !== 'OPENCOURIER'
  return { text: event.message, recordedInEnglish: !fromPartner }
}

// ── Other sentences sent by code (review of 2026-11-22) ──────────────────────────────────────

/**
 * A sentence the server sends as a code with values beside its English (a dispatch board row's
 * `detailCode`, a restaurant's `notAcceptingCode`): the text of `server.<group>.<code>` in the reader's
 * language, else the server's English as sent (no code, or a code newer than this copy).
 */
export function codedSentenceText(
  i18n: I18n,
  group: 'board' | 'error' | 'notice',
  code: string | null | undefined,
  params: EventMessageParams | null | undefined,
  english: string,
): string {
  const key = `server.${group}.${code}`
  return code && hasServerText(i18n, key) ? renderServerText(i18n, key, params ?? {}) : english
}

// ── Refusals (AC-6) ──────────────────────────────────────────────────────────────────────────

/** What a failed admin call can carry (the SDK's ApiError, or anything else that was thrown). */
export interface ServerError {
  code?: unknown
  message?: unknown
  statusCode?: unknown
  params?: unknown
}

/**
 * The words for a server's refusal in the reader's language, or undefined when it carried none (then
 * the caller shows its own sentence). A code with a text in the language files wins; otherwise the
 * server's own sentence, which is English. A failure the server never answered (no statusCode: a
 * dropped connection) gives undefined, so the caller's own words show rather than developer English
 * (the gap request-web's review found, finding 4).
 */
export function serverErrorText(i18n: I18n, error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const failure = error as ServerError
  if (typeof failure.statusCode !== 'number') return undefined
  if (typeof failure.code === 'string' && hasServerText(i18n, `server.error.${failure.code}`)) {
    const params =
      typeof failure.params === 'object' && failure.params !== null
        ? (failure.params as EventMessageParams)
        : {}
    return renderServerText(i18n, `server.error.${failure.code}`, params)
  }
  return typeof failure.message === 'string' && failure.message.length > 0 ? failure.message : undefined
}
