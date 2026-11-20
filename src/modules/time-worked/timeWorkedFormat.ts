import type { JobEndLabel, TimeWorkedChangeCause, TimeWorkedCourierStatus } from '../../backend-admin-sdk'
import { athensToday } from '../dispatch-stop/dispatchStopDisplay'

// Spec 0040: plain helpers for the Time worked page and a rider's Time worked card. Days are
// YYYY-MM-DD in Europe/Athens, as the server counts them; this file does no timezone maths of its own.

// The longest ranges the server accepts (AC-14, AC-15).
export const TOTALS_MAX_DAYS = 92
export const RIDER_MAX_DAYS = 31

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function isDay(text: unknown): text is string {
  if (typeof text !== 'string' || !DAY.test(text)) return false
  const date = new Date(`${text}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
}

// A day moved by whole days, worked out on the calendar date alone (no timezone involved).
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// How many days a range covers, both ends included.
export function daysInRange(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
}

export type DayRange = { from: string; to: string }

// The range in the URL when it is valid and within the limit, else the last `defaultDays` days ending
// today. A sentence says why a range was not used, so a pasted link never fails silently.
export function rangeFromQuery(
  from: unknown,
  to: unknown,
  maxDays: number,
  defaultDays: number,
  now: Date = new Date()
): { range: DayRange; problem: string | null } {
  const today = athensToday(now)
  const fallback = { from: addDays(today, -(defaultDays - 1)), to: today }
  if (from === undefined && to === undefined) return { range: fallback, problem: null }
  if (!isDay(from) || !isDay(to))
    return {
      range: fallback,
      problem: 'The dates must be days written as YYYY-MM-DD.',
    }
  if (from > to)
    return {
      range: fallback,
      problem: 'The first day must be on or before the last day.',
    }
  if (daysInRange(from, to) > maxDays)
    return {
      range: fallback,
      problem: `A range may cover at most ${maxDays} days.`,
    }
  return { range: { from, to }, problem: null }
}

// "3 h 12 min", "48 min", "0 min".
// A calendar day (YYYY-MM-DD) in words, "Thu 19 Nov 2026". The day is formatted in UTC so it stays the
// same day whatever the browser's zone. Used by the rider card and the totals page alike.
export function formatDay(day: string, withWeekday = true): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: withWeekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// The totals add up only the days inside the range, so a "By week" row whose Monday to Sunday week
// reaches outside it is part of a week. This says which part, or null for a whole week (review
// 2026-11-20, decision 36.49).
export function weekPart(monday: string, range: DayRange): string | null {
  const sunday = addDays(monday, 6)
  const first = monday < range.from ? range.from : monday
  const last = sunday > range.to ? range.to : sunday
  if (first === monday && last === sunday) return null
  const short = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  return first === last
    ? `part of the week: ${short(first)} only`
    : `part of the week: ${short(first)} to ${short(last)}`
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(0, Math.floor(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

// "38%" for unpaid over work, or an em dash with no work time.
export function formatShare(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

export const STATUS_LABELS: Record<TimeWorkedCourierStatus, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  LAST_CALL: 'Last Call',
}

export const CAUSE_LABELS: Record<TimeWorkedChangeCause, string> = {
  RIDER: 'by the rider',
  ADMIN: 'by an admin',
  CUT_OFF: 'by a password change',
  LAST_CALL_ACCEPTED: 'on accepting their last job',
  SYSTEM_START: 'when recording began',
}

// Spec 0042 (AC-8): how a job ended when not in this rider's drop off, the rider app's words.
export const END_LABELS: Record<JobEndLabel, string> = {
  CANCELLED_AFTER_PICKUP: 'Cancelled after pickup',
  CANCELLED: 'Cancelled',
  REMOVED: 'Removed',
  HANDED_BACK: 'Handed back',
  REASSIGNED: 'Reassigned',
  FAILED: 'Failed',
  ENDED: 'Ended',
  IN_PROGRESS: 'In progress',
}

// "1.2 km", one decimal (spec 0042 AC-1).
export function formatKm(km: number): string {
  return `${(Math.round(km * 10) / 10).toFixed(1)} km`
}

// Accept to the job's end (or now, while held), in whole minutes, rounded as the server rounds them.
export function jobMinutes(job: { acceptedAt: string; endedAt: string | null }, now: number = Date.now()): number {
  return Math.round(((job.endedAt ? Date.parse(job.endedAt) : now) - Date.parse(job.acceptedAt)) / 60_000)
}
