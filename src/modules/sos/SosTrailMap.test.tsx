import React from 'react'
import { render, screen } from '@testing-library/react'
import SosTrailMap from './SosTrailMap'
import type { SosPointAdminDto } from '@/backend-admin-sdk'

const mockSetView = jest.fn()
const mockFitBounds = jest.fn()

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center }: any) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Polyline: ({ positions, pathOptions }: any) => (
    <div
      data-testid="polyline"
      data-positions={JSON.stringify(positions)}
      data-color={pathOptions?.color}
    />
  ),
  CircleMarker: ({ center, children }: any) => (
    <div data-testid="circle-marker" data-center={JSON.stringify(center)}>
      {children}
    </div>
  ),
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  useMap: () => ({
    setView: mockSetView,
    fitBounds: mockFitBounds,
  }),
}))

describe('SosTrailMap (spec 0022, AC-9, AC-13)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders Polyline and CircleMarker for the newest position when points are provided', () => {
    const points: SosPointAdminDto[] = [
      { latitude: 39.36, longitude: 22.94, accuracyMetres: 5, recordedAt: '2026-11-03T10:00:00Z' },
      { latitude: 39.37, longitude: 22.95, accuracyMetres: 4, recordedAt: '2026-11-03T10:01:00Z' },
    ]

    render(<SosTrailMap points={points} />)

    expect(screen.getByTestId('sos-trail-map')).toBeInTheDocument()

    // Polyline with correct trail positions
    const polyline = screen.getByTestId('polyline')
    expect(polyline).toBeInTheDocument()
    expect(JSON.parse(polyline.getAttribute('data-positions') || '[]')).toEqual([
      [39.36, 22.94],
      [39.37, 22.95],
    ])
    expect(polyline.getAttribute('data-color')).toBe('#c8453e')

    // CircleMarker at the newest position
    const circle = screen.getByTestId('circle-marker')
    expect(JSON.parse(circle.getAttribute('data-center') || '[]')).toEqual([39.37, 22.95])
    expect(screen.getByTestId('tooltip')).toHaveTextContent(/Last position, /)

    // FitToTrail bounds fitting
    expect(mockFitBounds).toHaveBeenCalledWith(
      [
        [39.36, 22.94],
        [39.37, 22.95],
      ],
      { padding: [32, 32], maxZoom: 18 },
    )
  })

  it('sets view directly when only 1 point exists and skips Polyline', () => {
    const points: SosPointAdminDto[] = [
      { latitude: 39.365, longitude: 22.945, accuracyMetres: 5, recordedAt: '2026-11-03T10:00:00Z' },
    ]

    render(<SosTrailMap points={points} />)

    expect(screen.queryByTestId('polyline')).not.toBeInTheDocument()
    expect(screen.getByTestId('circle-marker')).toBeInTheDocument()
    expect(mockSetView).toHaveBeenCalledWith([39.365, 22.945], 17)
  })
})
