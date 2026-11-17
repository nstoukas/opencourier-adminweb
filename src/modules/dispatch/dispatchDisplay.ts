import type { DispatchAttentionRowDto } from '@/backend-admin-sdk'

// After this long with failing polls, the header stops saying "updated" (spec 0034, AC-15).
export const STALE_AFTER_SECONDS = 30

// The map's marker colours and its legend's, kept here because Leaflet cannot load on the server.
export const FREE_COLOR = '#2f7d4f'
export const BUSY_COLOR = '#2f3237'
export const WAITING_COLOR = '#c8453e'

// Whole minutes since an ISO time; never below zero, in case the two clocks disagree.
export function minutesSince(iso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60_000))
}

// Red marks a problem nobody has taken, yellow one that is running (spec 0034, AC-3).
export function isRedRow(kind: string): boolean {
  return kind === 'SOS' || kind === 'WAITING_FOR_RIDER'
}

// Where a row's Open goes. A kind this page does not know yet still opens something.
export function rowHref(row: DispatchAttentionRowDto): string {
  if (row.sosId) return `/sos/${row.sosId}`
  // An unread chat thread (spec 0034, AC-17).
  if (row.threadId) return `/chat/${row.threadId}`
  if (row.deliveryId) return `/deliveries/${row.deliveryId}`
  return '/deliveries'
}

// The south west and north east corners of the service area, as Leaflet wants them ([lat, lng]).
// `details.region` is GeoJSON of any shape, so this walks it for coordinate pairs.
export function regionBounds(region: unknown): [[number, number], [number, number]] | null {
  const points: [number, number][] = []
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      if (typeof node[0] === 'number' && typeof node[1] === 'number') {
        points.push([node[1], node[0]])
        return
      }
      node.forEach(walk)
      return
    }
    const geo = node as { features?: unknown; geometry?: unknown; geometries?: unknown; coordinates?: unknown }
    walk(geo.features)
    walk(geo.geometry)
    walk(geo.geometries)
    walk(geo.coordinates)
  }
  walk(region)
  if (points.length === 0) return null
  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ]
}
