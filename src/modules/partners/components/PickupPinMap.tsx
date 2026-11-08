import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type Props = {
  latitude: number
  longitude: number
}

// Spec 0024 (AC-4): where riders are sent to collect, so a representative can spot a wrong pin
// before a rider does. Read only: no dragging, no scroll zoom. A CircleMarker needs no icon file,
// so it avoids Leaflet's broken default icon under webpack. A restaurant's address is public
// business information, so loading OpenStreetMap tiles for it shares nothing personal.
// Loaded only in the browser (the page imports it with `ssr: false`), because Leaflet needs `window`.
export default function PickupPinMap({ latitude, longitude }: Props) {
  return (
    <div className="relative z-0 h-48 w-full overflow-hidden rounded-lg border" data-testid="pickup-pin-map">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={false}
        dragging={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <CircleMarker
          center={[latitude, longitude]}
          radius={9}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2f2f2f', fillOpacity: 1 }}
        />
      </MapContainer>
    </div>
  )
}
