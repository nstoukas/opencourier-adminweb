import type { DispatchStopAdminDto, DispatchStopReason } from '@/backend-admin-sdk'

// Spec 0014: every stop time is entered and shown in Athens time, whatever the admin's computer says.
export const INSTANCE_TIMEZONE = 'Europe/Athens'

export const REASON_LABELS: Record<DispatchStopReason, string> = {
  HEAT: 'Heat',
  STORM: 'Storm',
  OTHER: 'Other',
}

// "Sat 1 Nov, 12:00" in Athens time.
export function athensDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: INSTANCE_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

// "12:00" in Athens time.
export function athensTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: INSTANCE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

// An end time, with its date only when it falls on another Athens day than `fromIso`
// ("17:00", or "Sun 2 Nov, 06:00").
export function athensEnd(fromIso: string, endIso: string): string {
  return athensToday(new Date(fromIso)) === athensToday(new Date(endIso)) ? athensTime(endIso) : athensDateTime(endIso)
}

// Today's date in Athens as YYYY-MM-DD, the default of the date fields.
export function athensToday(now: Date = new Date()): string {
  // en-CA formats a date as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: INSTANCE_TIMEZONE }).format(now)
}

// What happened to a stop, in words, for the history.
// Who ended or cancelled it is shown by the end of their user id, as who started it is (row 29 review).
export function stopOutcome(stop: DispatchStopAdminDto): string {
  if (stop.cancelledAt) {
    return `Cancelled ${athensDateTime(stop.cancelledAt)}${
      stop.cancelledByUserId ? ` by ${stop.cancelledByUserId.slice(-6)}` : ''
    }`
  }
  if (stop.endedAt) {
    return `Restarted ${athensDateTime(stop.endedAt)}${stop.endedByUserId ? ` by ${stop.endedByUserId.slice(-6)}` : ''}`
  }
  if (stop.endWorkDoneAt) return 'Ended as planned'
  if (stop.startedAt) return 'On'
  return 'Scheduled'
}

// The end a stop really had or has: a restart, else the planned end, else none.
export function effectiveEnd(stop: DispatchStopAdminDto): string | null {
  return stop.endedAt ?? stop.endsAt
}
