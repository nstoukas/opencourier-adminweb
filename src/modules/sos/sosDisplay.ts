import type { TFunction } from 'i18next'
import type { SosIncidentAdminDto, SosOutcome } from '@/backend-admin-sdk'
import type { Formats } from '@/i18n/useFormat'
import { riderName } from './sosAlerts'

// Spec 0022: the words admins read about an SOS, in the reader's language (spec 0054). Times are Athens
// time, like every instance time. The helpers take `t` (from the component's useTranslation) and, for
// times, `f` (from useFormat), so the words and dates follow the language.

// An outcome in words. A new outcome the server added shows as its code.
export function outcomeLabel(outcome: SosOutcome, t: TFunction): string {
  // defaultValue is what i18next returns when the language files have no key for this value.
  return t(`sos.outcome.${outcome}`, { defaultValue: outcome })
}

// A state in words ("Active", "Awaiting close", "Closed").
export function stateLabel(state: SosIncidentAdminDto['state'], t: TFunction): string {
  return t(`sos.state.${state}`, { defaultValue: state })
}

// The outcomes in the order the close dialog offers them (AC-10).
export const SOS_OUTCOMES: SosOutcome[] = ['RIDER_SAFE', 'HELP_ARRIVED', 'FALSE_ALARM', 'OTHER']

// The longest note an admin may write when closing (the backend's limit).
export const SOS_NOTE_MAX = 500

// "Sat 01/11, 12:00" on Athens time: the weekday and date, then the time.
export function sosTime(f: Formats, iso: string | Date): string {
  return `${f.weekdayDate(iso)}, ${f.time(iso)}`
}

// "just now", "4 min ago", "2 h 5 min ago": how long an SOS has been running.
export function timeAgo(iso: string, now: Date, t: TFunction): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return t('sos.ago.justNow')
  if (minutes < 60) return t('sos.ago.minutes', { minutes })
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? t('sos.ago.hours', { hours }) : t('sos.ago.hoursMinutes', { hours, minutes: rest })
}

// The banner's sentence for one incident (AC-8): "SOS: Maria Papadopoulou, 4 min ago", or
// "Maria Papadopoulou marked safe, awaiting close".
export function bannerText(incident: SosIncidentAdminDto, now: Date, t: TFunction): string {
  const name = riderName(incident)
  if (incident.state === 'ACTIVE') return t('sos.banner.active', { name, ago: timeAgo(incident.startedAt, now, t) })
  if (incident.falseAlarmAt) return t('sos.banner.falseAlarm', { name })
  return t('sos.banner.safe', { name })
}

// How the rider ended it, if they did: "Safe at Sat 01/11, 12:00" or "False alarm at …".
export function riderEnd(incident: SosIncidentAdminDto, t: TFunction, f: Formats): string | null {
  if (incident.safeAt) return t('sos.riderEnd.safe', { time: sosTime(f, incident.safeAt) })
  if (incident.falseAlarmAt) return t('sos.riderEnd.falseAlarm', { time: sosTime(f, incident.falseAlarmAt) })
  return null
}

// Who closed it, by the login they used.
export function closedByName(incident: SosIncidentAdminDto, t: TFunction): string | null {
  if (!incident.closedBy) return null
  return incident.closedBy.username ?? incident.closedBy.email ?? t('sos.anAdmin')
}
