import { memo, useEffect, useRef } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { DispatchMapCourierDto, DispatchMapDto } from '@/backend-admin-sdk'
import { BUSY_COLOR, FREE_COLOR, regionBounds, WAITING_COLOR } from './dispatchDisplay'

// A square, so a waiting delivery differs from a rider by shape as well as colour.
const waitingIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:14px;height:14px;background:${WAITING_COLOR};border:2px solid #fff;border-radius:3px"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// Frames the service area once. After that a poll never moves the map, so a zoom or pan the
// dispatcher made is not undone every 10 s.
function FitToRegion({ region }: { region: unknown }) {
  const map = useMap()
  // `useRef` keeps whether the first fit happened across redraws, without causing one.
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current) return
    const bounds = regionBounds(region)
    if (!bounds) return
    fitted.current = true
    map.fitBounds(bounds, { padding: [16, 16] })
  }, [map, region])
  return null
}

function CourierPopup({ courier }: { courier: DispatchMapCourierDto }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">{courier.name}</p>
      {courier.carrying.map((job) => (
        <p key={job.deliveryId}>
          <Link className="underline" href={`/deliveries/${job.deliveryId}`}>
            {job.orderReference ? `#${job.orderReference}` : 'Delivery'}
          </Link>
          {job.offered ? ' offered' : ''}
          {/* Spec 0048 (AC-12): one of two orders offered or carried together. */}
          {job.paired ? ' (two orders together)' : ''}
        </p>
      ))}
    </div>
  )
}

type Props = {
  map: DispatchMapDto
  region: unknown
}

// Spec 0034, AC-11 to AC-13: the latest position of working riders and where deliveries wait. Holds
// only this answer: no line, trail or earlier position is drawn or kept (AC-18). `memo` skips a
// redraw when the props have not changed, so the page's one second clock does not redraw the map.
// Loaded only in the browser (the page imports it with `ssr: false`), because Leaflet needs `window`.
function DispatchMap({ map, region }: Props) {
  return (
    <div className="relative z-0 h-[420px] w-full overflow-hidden rounded-lg border" data-testid="dispatch-map">
      <MapContainer center={[39.3622, 22.9425]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {map.couriers.map((courier) => (
          <CircleMarker
            key={courier.id}
            center={[courier.latitude, courier.longitude]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: courier.state === 'FREE' ? FREE_COLOR : BUSY_COLOR,
              fillOpacity: 1,
            }}
          >
            <Popup>
              <CourierPopup courier={courier} />
            </Popup>
          </CircleMarker>
        ))}
        {map.waitingDeliveries.map((delivery) => (
          <Marker key={delivery.deliveryId} position={[delivery.latitude, delivery.longitude]} icon={waitingIcon}>
            <Popup>
              <Link className="underline" href={`/deliveries/${delivery.deliveryId}`}>
                {delivery.orderReference ? `#${delivery.orderReference}` : 'Delivery'}
              </Link>
            </Popup>
          </Marker>
        ))}
        <FitToRegion region={region} />
      </MapContainer>
    </div>
  )
}

export default memo(DispatchMap)
