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
//   $t(server.enum.x.{{name}})   another key, looked up after the value is filled in
// A value can be a "part" ({ part, params }) or a list of parts: each is rendered first, from
// `server.eventPart.<part>`. This file renders exactly as the backend does, line for line (decision
// 47.30), rather than leaning on i18next's own interpolation, whose nesting and array handling differ.
// ─────────────────────────────────────────────────────────────────────────────────────────────
import type { i18n as I18n } from 'i18next'
import type { EventMessageParams, EventParamValue, EventPart } from '@/shared-types/event-messages'
import { formatTime } from './format'
import { toLanguage, type Language } from './language'

// Each language's word for the last "and" of a list (no comma before it in either), as the backend has it.
const LIST_AND: Record<Language, string> = { el: 'και', en: 'and' }

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
  return String(value)
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*(?:,\s*(\w+)\s*)?\}\}/g

function render(i18n: I18n, language: Language, key: string, params: EventMessageParams): string {
  const template = lookup(i18n, language, key) ?? lookup(i18n, 'en', key)
  if (template === null) return key
  const fill = (text: string) =>
    text.replace(PLACEHOLDER, (_match, name: string, format?: string) =>
      formatValue(i18n, language, params[name], format),
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
