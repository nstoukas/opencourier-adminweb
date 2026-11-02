import type { SosIncidentAdminDto, SosOutcome } from '@/backend-admin-sdk'
import { athensDateTime } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { riderName } from './sosAlerts'

// Spec 0022: the words admins read about an SOS. Times are Athens time, like every instance time.

export const SOS_OUTCOME_LABELS: Record<SosOutcome, string> = {
  RIDER_SAFE: 'Rider safe',
  HELP_ARRIVED: 'Help arrived',
  FALSE_ALARM: 'False alarm',
  OTHER: 'Other',
}

// The outcomes in the order the close dialog offers them (AC-10).
export const SOS_OUTCOMES: SosOutcome[] = ['RIDER_SAFE', 'HELP_ARRIVED', 'FALSE_ALARM', 'OTHER']

// The longest note an admin may write when closing (the backend's limit).
export const SOS_NOTE_MAX = 500

// "just now", "4 min ago", "2 h 5 min ago": how long an SOS has been running.
export function timeAgo(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h ago` : `${hours} h ${rest} min ago`
}

// The banner's sentence for one incident (AC-8): "SOS: Maria Papadopoulou, 4 min ago", or
// "Maria Papadopoulou marked safe, awaiting close".
export function bannerText(incident: SosIncidentAdminDto, now: Date): string {
  const name = riderName(incident)
  if (incident.state === 'ACTIVE') return `SOS: ${name}, ${timeAgo(incident.startedAt, now)}`
  if (incident.falseAlarmAt) return `${name} marked false alarm, awaiting close`
  return `${name} marked safe, awaiting close`
}

// How the rider ended it, if they did: "Safe at Sat 1 Nov, 12:00" or "False alarm at …".
export function riderEnd(incident: SosIncidentAdminDto): string | null {
  if (incident.safeAt) return `Safe at ${athensDateTime(incident.safeAt)}`
  if (incident.falseAlarmAt) return `False alarm at ${athensDateTime(incident.falseAlarmAt)}`
  return null
}

// Who closed it, by the login they used.
export function closedByName(incident: SosIncidentAdminDto): string | null {
  if (!incident.closedBy) return null
  return incident.closedBy.username ?? incident.closedBy.email ?? 'an admin'
}

export const STATE_LABELS: Record<SosIncidentAdminDto['state'], string> = {
  ACTIVE: 'Active',
  AWAITING_CLOSE: 'Awaiting close',
  CLOSED: 'Closed',
}
