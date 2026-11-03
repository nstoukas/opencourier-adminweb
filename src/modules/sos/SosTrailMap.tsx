import { useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { SosPointAdminDto } from '@/backend-admin-sdk'
import { athensDateTime } from '@/modules/dispatch-stop/dispatchStopDisplay'

type Props = {
  // Oldest first, as the backend sends them.
  points: SosPointAdminDto[]
}

// Fits the map to the trail once, when it first has points. After that a new point only moves the
// map if the rider has left what is on screen, so a zoom or pan the admin made to read a street
// name is not undone by every 10 s poll (row 73 review).
function FitToTrail({ points }: Props) {
  const map = useMap()
  // `useRef` keeps whether the first fit happened across redraws, without causing one.
  const fitted = useRef(false)
  useEffect(() => {
    const newest = points[points.length - 1]
    if (!newest) return
    if (fitted.current) {
      if (!map.getBounds().contains([newest.latitude, newest.longitude])) {
        map.panTo([newest.latitude, newest.longitude])
      }
      return
    }
    fitted.current = true
    if (points.length === 1) {
      map.setView([newest.latitude, newest.longitude], 17)
      return
    }
    map.fitBounds(
      points.map((point) => [point.latitude, point.longitude] as [number, number]),
      { padding: [32, 32], maxZoom: 18 },
    )
  }, [map, points])
  return null
}

// Spec 0022 (AC-9): where a rider's phone was during their SOS. Read only; shown on the incident's
// page and nowhere else (AC-13). The newest point is the big red one. Loaded only in the browser
// (the page imports it with `ssr: false`), because Leaflet needs `window`.
export default function SosTrailMap({ points }: Props) {
  const trail = points.map((point) => [point.latitude, point.longitude] as [number, number])
  const newest = points[points.length - 1]
  return (
    <div className="relative z-0 h-[420px] w-full overflow-hidden rounded-lg border" data-testid="sos-trail-map">
      <MapContainer
        center={newest ? [newest.latitude, newest.longitude] : [39.3622, 22.9425]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {trail.length > 1 ? <Polyline positions={trail} pathOptions={{ color: '#c8453e', weight: 4 }} /> : null}
        {newest ? (
          <CircleMarker
            center={[newest.latitude, newest.longitude]}
            radius={9}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#c8453e', fillOpacity: 1 }}
          >
            <Tooltip>Last position, {athensDateTime(newest.recordedAt)}</Tooltip>
          </CircleMarker>
        ) : null}
        <FitToTrail points={points} />
      </MapContainer>
    </div>
  )
}
