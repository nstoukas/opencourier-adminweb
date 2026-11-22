import type { TFunction } from 'i18next'
import type { DispatchStopAdminDto, DispatchStopReason } from '@/backend-admin-sdk'
import { LOCALES, type Language } from '@/i18n/language'

// Spec 0014: every stop time is entered and shown in Athens time, whatever the admin's computer says.
export const INSTANCE_TIMEZONE = 'Europe/Athens'

// The reasons in the order the dialog lists them, each with its words' key (spec 0054: translated when shown).
export const REASON_KEYS: Record<DispatchStopReason, string> = {
  HEAT: 'dispatchStop.reason.HEAT',
  STORM: 'dispatchStop.reason.STORM',
  OTHER: 'dispatchStop.reason.OTHER',
}

// A reason in the reader's language ("Heat", "Καύσωνας"). A reason the backend added after these words
// is shown as its code (defaultValue is what i18next returns when the key does not exist).
export function reasonLabel(t: TFunction, reason: DispatchStopReason): string {
  return t(`dispatchStop.reason.${reason}`, { defaultValue: reason })
}

// "Sat 1 Nov, 12:00" (English) or "Σάβ 1 Νοε, 12:00" (Greek), in Athens time. `language` picks the
// words of the weekday and month (spec 0054); left out it is English, as every caller had before row 47.
export function athensDateTime(iso: string, language: Language = 'en'): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    timeZone: INSTANCE_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

// "12:00" in Athens time (the same digits in both languages; `language` is taken for symmetry).
export function athensTime(iso: string, language: Language = 'en'): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    timeZone: INSTANCE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

// An end time, with its date only when it falls on another Athens day than `fromIso`
// ("17:00", or "Sun 2 Nov, 06:00").
export function athensEnd(fromIso: string, endIso: string, language: Language = 'en'): string {
  return athensToday(new Date(fromIso)) === athensToday(new Date(endIso))
    ? athensTime(endIso, language)
    : athensDateTime(endIso, language)
}

// Today's date in Athens as YYYY-MM-DD, the default of the date fields. Not words, so not translated.
export function athensToday(now: Date = new Date()): string {
  // en-CA formats a date as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: INSTANCE_TIMEZONE }).format(now)
}

// What happened to a stop, in words, for the history. It takes `t` (from useTranslation) because its
// sentence carries a time and a user, and the language for the time's words.
// Who ended or cancelled it is shown by the end of their user id, as who started it is (row 29 review).
export function stopOutcome(t: TFunction, language: Language, stop: DispatchStopAdminDto): string {
  if (stop.cancelledAt) {
    const time = athensDateTime(stop.cancelledAt, language)
    return stop.cancelledByUserId
      ? t('dispatchStop.outcome.cancelledBy', { time, user: stop.cancelledByUserId.slice(-6) })
      : t('dispatchStop.outcome.cancelled', { time })
  }
  if (stop.endedAt) {
    const time = athensDateTime(stop.endedAt, language)
    return stop.endedByUserId
      ? t('dispatchStop.outcome.restartedBy', { time, user: stop.endedByUserId.slice(-6) })
      : t('dispatchStop.outcome.restarted', { time })
  }
  if (stop.endWorkDoneAt) return t('dispatchStop.outcome.endedAsPlanned')
  if (stop.startedAt) return t('dispatchStop.outcome.on')
  return t('dispatchStop.outcome.scheduled')
}

// The end a stop really had or has: a restart, else the planned end, else none.
export function effectiveEnd(stop: DispatchStopAdminDto): string | null {
  return stop.endedAt ?? stop.endsAt
}
