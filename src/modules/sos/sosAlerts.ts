// Spec 0022 (AC-8): how an admin's browser gets a rider's SOS noticed, even in a background tab.
//
// - A repeating sound while an SOS is active. Made with the Web Audio API, so there is no sound
//   file; browsers only let a page play sound after a click on it, which is what "Enable SOS
//   alerts" is for.
// - One browser notification per new SOS, tagged with its id, so several open tabs show one.
// - A poll tick every 10 s from a tiny Web Worker: Chrome slows an ordinary page timer to once a
//   minute in a tab hidden for 5 minutes, but not a worker's timer.

import type { SosIncidentAdminDto } from '@/backend-admin-sdk'

export const SOS_POLL_MS = 10_000

const ENABLED_KEY = 'sosAlertsEnabled'
const NOTIFIED_KEY = 'sosNotifiedIds'

// ---- The admin's choice, remembered on this browser ----

// Browser storage can be missing or throw (a private window, blocked site data): treat that as
// "not enabled", never as an error.
export function sosAlertsChosen(): boolean {
  try {
    return window.localStorage.getItem(ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

function rememberChoice(): void {
  try {
    window.localStorage.setItem(ENABLED_KEY, '1')
  } catch {
    // Not remembered: the admin clicks again next time.
  }
}

// ---- Sound ----

// One AudioContext for the page. `typeof window` guards the server render, where there is none.
let audio: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  // Read through a looser type: the DOM types say every browser has AudioContext, and old ones do not.
  const Ctx = (window as { AudioContext?: typeof AudioContext }).AudioContext
  if (!Ctx) return null
  if (!audio) audio = new Ctx()
  return audio
}

// True when this page may play sound now. After a reload the browser locks audio again until the
// next click anywhere on the page.
export function soundUnlocked(): boolean {
  return audio?.state === 'running'
}

// Tries to unlock the sound. Only works inside a click (or another user gesture).
export async function unlockSound(): Promise<boolean> {
  const ctx = audioContext()
  if (!ctx) return false
  try {
    await ctx.resume()
  } catch {
    return false
  }
  return ctx.state === 'running'
}

// Three short high beeps, an alarm that cannot be mistaken for the app's other sounds.
export function playSosSound(): void {
  const ctx = audioContext()
  if (!ctx || ctx.state !== 'running') return
  const start = ctx.currentTime
  for (let i = 0; i < 3; i++) {
    const at = start + i * 0.35
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(880, at)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + 0.3)
  }
}

// ---- Notifications ----

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationsAllowed(): boolean {
  return notificationsSupported() && Notification.permission === 'granted'
}

// The "Enable SOS alerts" click: unlocks the sound, asks for notifications, and remembers the
// choice on this browser. Must be called from the click itself.
export async function enableSosAlerts(): Promise<void> {
  rememberChoice()
  await unlockSound()
  if (notificationsSupported() && Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      // An old browser with the callback form only, or a refusal: the banner and sound still work.
    }
  }
}

// The ids this browser already notified, kept so a reload or another tab does not notify again.
function notifiedIds(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function rememberNotified(ids: Set<string>, stillOpen: string[]): void {
  try {
    // Only the ids still open are kept, so the list never grows without end.
    const kept = Array.from(ids).filter((id) => stillOpen.includes(id))
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(kept))
  } catch {
    // Not kept: at worst a second notification with the same tag, which replaces the first.
  }
}

// The person a notification names: the rider's name, never anything about their position.
export function riderName(incident: Pick<SosIncidentAdminDto, 'courier'>): string {
  return `${incident.courier.firstName} ${incident.courier.lastName}`.trim()
}

// One notification for each active SOS this browser has not notified yet. `onOpen` runs when the
// admin clicks it (the incident's page).
export function notifyNewSos(incidents: SosIncidentAdminDto[], onOpen: (id: string) => void): void {
  if (!notificationsAllowed()) return
  const ids = notifiedIds()
  for (const incident of incidents) {
    if (incident.state !== 'ACTIVE' || ids.has(incident.id)) continue
    try {
      const notification = new Notification(`SOS: ${riderName(incident)}`, {
        body: 'A rider needs help. Open the admin to see where they are.',
        tag: `sos-${incident.id}`,
        requireInteraction: true,
      })
      notification.onclick = () => {
        window.focus()
        onOpen(incident.id)
        notification.close()
      }
    } catch {
      // Some browsers only allow notifications from a service worker; the banner and sound remain.
    }
    ids.add(incident.id)
  }
  rememberNotified(
    ids,
    incidents.map((incident) => incident.id),
  )
}

// ---- The poll tick ----

const WORKER_SOURCE = `setInterval(function () { postMessage('tick') }, ${SOS_POLL_MS})`

// Calls `onTick` every 10 s, from a worker when the browser has them, else from a page timer.
// Returns the function that stops it.
export function startSosTicker(onTick: () => void): () => void {
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined' && typeof Blob !== 'undefined' ) {
    try {
      const url = window.URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
      const worker = new Worker(url)
      worker.onmessage = () => onTick()
      return () => {
        worker.terminate()
        window.URL.revokeObjectURL(url)
      }
    } catch {
      // Falls through to a page timer.
    }
  }
  const timer = setInterval(onTick, SOS_POLL_MS)
  return () => clearInterval(timer)
}
