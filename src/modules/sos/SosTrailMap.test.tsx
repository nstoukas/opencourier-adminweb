import React from 'react'
import { render, screen } from '@testing-library/react'
import SosTrailMap from './SosTrailMap'
import type { SosPointAdminDto } from '@/backend-admin-sdk'

const mockSetView = jest.fn()
const mockFitBounds = jest.fn()
const mockPanTo = jest.fn()
// Whether a point lies inside what the map shows now; each test decides.
const mockContains = jest.fn()
// One map for the whole render, as react-leaflet's useMap gives.
const mockMap = {
  setView: (...args: unknown[]) => mockSetView(...args),
  fitBounds: (...args: unknown[]) => mockFitBounds(...args),
  panTo: (...args: unknown[]) => mockPanTo(...args),
  getBounds: () => ({ contains: (...args: unknown[]) => mockContains(...args) }),
}

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
  useMap: () => mockMap,
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

  // Row 73 review: the map fits to the trail once. A 10 s poll must not undo a zoom or pan the admin
  // made; it only moves the map when the rider has left what is on screen.
  describe('after the first fit', () => {
    const first: SosPointAdminDto[] = [
      { latitude: 39.36, longitude: 22.94, accuracyMetres: 5, recordedAt: '2026-11-03T10:00:00Z' },
      { latitude: 39.37, longitude: 22.95, accuracyMetres: 4, recordedAt: '2026-11-03T10:01:00Z' },
    ]
    const nearby: SosPointAdminDto = {
      latitude: 39.371,
      longitude: 22.951,
      accuracyMetres: 4,
      recordedAt: '2026-11-03T10:02:00Z',
    }
    const faraway: SosPointAdminDto = {
      latitude: 39.5,
      longitude: 23.1,
      accuracyMetres: 4,
      recordedAt: '2026-11-03T10:03:00Z',
    }

    it('fits once; a new point inside the view does not fit or set the view again', () => {
      const { rerender } = render(<SosTrailMap points={first} />)
      expect(mockFitBounds).toHaveBeenCalledTimes(1)

      mockContains.mockReturnValue(true)
      // A poll answers: a new array (as RTK Query gives) with a point inside the view.
      rerender(<SosTrailMap points={[...first, nearby]} />)
      rerender(<SosTrailMap points={[...first, nearby, { ...nearby, recordedAt: '2026-11-03T10:02:10Z' }]} />)

      expect(mockFitBounds).toHaveBeenCalledTimes(1)
      expect(mockSetView).not.toHaveBeenCalled()
      expect(mockPanTo).not.toHaveBeenCalled()
    })

    it('a newest point outside the view pans to it, without re-fitting', () => {
      const { rerender } = render(<SosTrailMap points={first} />)
      expect(mockFitBounds).toHaveBeenCalledTimes(1)

      mockContains.mockReturnValue(false)
      rerender(<SosTrailMap points={[...first, faraway]} />)

      expect(mockContains).toHaveBeenCalledWith([39.5, 23.1])
      expect(mockPanTo).toHaveBeenCalledTimes(1)
      expect(mockPanTo).toHaveBeenCalledWith([39.5, 23.1])
      expect(mockFitBounds).toHaveBeenCalledTimes(1)
      expect(mockSetView).not.toHaveBeenCalled()
    })

    it('a trail that started with one point (setView) is not re-fitted when it grows', () => {
      const { rerender } = render(<SosTrailMap points={first.slice(0, 1)} />)
      expect(mockSetView).toHaveBeenCalledTimes(1)

      mockContains.mockReturnValue(true)
      rerender(<SosTrailMap points={first} />)

      expect(mockSetView).toHaveBeenCalledTimes(1)
      expect(mockFitBounds).not.toHaveBeenCalled()
    })
  })
})
