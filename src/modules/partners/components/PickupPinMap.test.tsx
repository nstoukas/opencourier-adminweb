import React from 'react'
import { render, screen } from '@testing-library/react'
import PickupPinMap from './PickupPinMap'

// react-leaflet replaced by plain elements that show the props they were given, as
// SosTrailMap.test.tsx does: JSDOM cannot draw a Leaflet map.
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, scrollWheelZoom, dragging }: any) => (
    <div
      data-testid="map-container"
      data-center={JSON.stringify(center)}
      data-zoom={zoom}
      data-scroll-wheel-zoom={String(scrollWheelZoom)}
      data-dragging={String(dragging)}
    >
      {children}
    </div>
  ),
  TileLayer: ({ url }: any) => <div data-testid="tile-layer" data-url={url} />,
  CircleMarker: ({ center }: any) => <div data-testid="circle-marker" data-center={JSON.stringify(center)} />,
  Marker: () => <div data-testid="marker" />,
}))

jest.mock('leaflet/dist/leaflet.css', () => ({}))

describe('PickupPinMap (spec 0024, AC-4)', () => {
  it('draws one CircleMarker at the pickup point, on OpenStreetMap tiles, centred there at zoom 16', () => {
    render(<PickupPinMap latitude={39.3628} longitude={22.9435} />)

    expect(screen.getAllByTestId('circle-marker')).toHaveLength(1)
    const marker = screen.getByTestId('circle-marker')
    expect(JSON.parse(marker.getAttribute('data-center') || '[]')).toEqual([39.3628, 22.9435])
    expect(screen.queryByTestId('marker')).toBeNull()

    const map = screen.getByTestId('map-container')
    expect(JSON.parse(map.getAttribute('data-center') || '[]')).toEqual([39.3628, 22.9435])
    expect(map).toHaveAttribute('data-zoom', '16')
    expect(screen.getByTestId('tile-layer').getAttribute('data-url')).toContain('tile.openstreetmap.org')
  })

  it('is read only: no scroll wheel zoom and no dragging, at a fixed height', () => {
    render(<PickupPinMap latitude={39.3628} longitude={22.9435} />)

    const map = screen.getByTestId('map-container')
    expect(map).toHaveAttribute('data-scroll-wheel-zoom', 'false')
    expect(map).toHaveAttribute('data-dragging', 'false')
    expect(screen.getByTestId('pickup-pin-map')).toHaveClass('h-48')
  })
})
