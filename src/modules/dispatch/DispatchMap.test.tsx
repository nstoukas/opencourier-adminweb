import React from 'react'
import { render, screen } from '@testing-library/react'
import DispatchMap from './DispatchMap'
import type { DispatchMapDto } from '@/backend-admin-sdk'
import { BUSY_COLOR, FREE_COLOR, WAITING_COLOR } from './dispatchDisplay'

const mockFitBounds = jest.fn()
const mockMap = {
  fitBounds: (...args: unknown[]) => mockFitBounds(...args),
}

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom }: any) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)} data-zoom={zoom}>
      {children}
    </div>
  ),
  TileLayer: ({ url }: any) => <div data-testid="tile-layer" data-url={url} />,
  CircleMarker: ({ center, pathOptions, children }: any) => (
    <div
      data-testid="circle-marker"
      data-center={JSON.stringify(center)}
      data-fill-color={pathOptions?.fillColor}
      data-radius={pathOptions?.radius}
    >
      {children}
    </div>
  ),
  Marker: ({ position, icon, children }: any) => (
    <div
      data-testid="waiting-marker"
      data-position={JSON.stringify(position)}
      data-icon-html={icon?.options?.html}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  useMap: () => mockMap,
}))

jest.mock('leaflet/dist/leaflet.css', () => ({}))

describe('DispatchMap (spec 0034, AC-11, AC-13, AC-18)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  const sampleMapData: DispatchMapDto = {
    couriers: [
      {
        id: 'c-free',
        name: 'Alex Free',
        latitude: 39.362,
        longitude: 22.942,
        state: 'FREE',
        carrying: [],
      },
      {
        id: 'c-busy',
        name: 'Maria Busy',
        latitude: 39.37,
        longitude: 22.95,
        state: 'BUSY',
        carrying: [
          { deliveryId: 'del-carried-1', orderReference: 'ORD1', offered: false },
          { deliveryId: 'del-offered-2', orderReference: 'ORD2', offered: true },
        ],
      },
    ],
    waitingDeliveries: [
      {
        deliveryId: 'del-wait-1',
        orderReference: 'WAIT1',
        latitude: 39.365,
        longitude: 22.945,
      },
    ],
  }

  const sampleRegion = {
    type: 'Polygon',
    coordinates: [
      [
        [22.94, 39.36],
        [22.96, 39.38],
      ],
    ],
  }

  it('draws free and busy courier markers and waiting delivery markers separately (AC-11)', () => {
    render(<DispatchMap map={sampleMapData} region={sampleRegion} />)

    // Two circle markers for the couriers
    const circleMarkers = screen.getAllByTestId('circle-marker')
    expect(circleMarkers).toHaveLength(2)

    // Free courier marker has FREE_COLOR
    expect(circleMarkers[0]).toHaveAttribute('data-fill-color', FREE_COLOR)
    expect(circleMarkers[0]).toHaveAttribute('data-center', JSON.stringify([39.362, 22.942]))

    // Busy courier marker has BUSY_COLOR
    expect(circleMarkers[1]).toHaveAttribute('data-fill-color', BUSY_COLOR)
    expect(circleMarkers[1]).toHaveAttribute('data-center', JSON.stringify([39.37, 22.95]))

    // One marker for the waiting delivery with WAITING_COLOR in icon html
    const waitingMarker = screen.getByTestId('waiting-marker')
    expect(waitingMarker).toHaveAttribute('data-position', JSON.stringify([39.365, 22.945]))
    expect(waitingMarker.getAttribute('data-icon-html')).toContain(WAITING_COLOR)
  })

  it('courier popup shows rider name and carried deliveries, with offered marked "offered" (AC-13)', () => {
    render(<DispatchMap map={sampleMapData} region={sampleRegion} />)

    // Rider 1 popup
    expect(screen.getByText('Alex Free')).toBeInTheDocument()

    // Rider 2 popup
    expect(screen.getByText('Maria Busy')).toBeInTheDocument()

    // Carried delivery link
    const carriedLink = screen.getByRole('link', { name: '#ORD1' })
    expect(carriedLink).toHaveAttribute('href', '/deliveries/del-carried-1')
    expect(carriedLink.parentElement?.textContent).toBe('#ORD1')

    // Offered delivery link with " offered" suffix
    const offeredLink = screen.getByRole('link', { name: '#ORD2' })
    expect(offeredLink).toHaveAttribute('href', '/deliveries/del-offered-2')
    expect(offeredLink.parentElement?.textContent).toBe('#ORD2 offered')

    // Waiting delivery popup link
    const waitLink = screen.getByRole('link', { name: '#WAIT1' })
    expect(waitLink).toHaveAttribute('href', '/deliveries/del-wait-1')
  })

  it('falls back to "Delivery" when orderReference is null', () => {
    const mapWithoutRef: DispatchMapDto = {
      couriers: [
        {
          id: 'c-noref',
          name: 'Nikos',
          latitude: 39.36,
          longitude: 22.94,
          state: 'BUSY',
          carrying: [{ deliveryId: 'del-noref', orderReference: null, offered: false }],
        },
      ],
      waitingDeliveries: [
        {
          deliveryId: 'del-wait-noref',
          orderReference: null,
          latitude: 39.361,
          longitude: 22.941,
        },
      ],
    }

    render(<DispatchMap map={mapWithoutRef} region={sampleRegion} />)

    const deliveryLinks = screen.getAllByRole('link', { name: 'Delivery' })
    expect(deliveryLinks).toHaveLength(2)
    expect(deliveryLinks[0]).toHaveAttribute('href', '/deliveries/del-noref')
    expect(deliveryLinks[1]).toHaveAttribute('href', '/deliveries/del-wait-noref')
  })

  it('fits map to service area bounds once without repeating on re-render', () => {
    const { rerender } = render(<DispatchMap map={sampleMapData} region={sampleRegion} />)

    expect(mockFitBounds).toHaveBeenCalledTimes(1)
    expect(mockFitBounds).toHaveBeenCalledWith(
      [
        [39.36, 22.94],
        [39.38, 22.96],
      ],
      { padding: [16, 16] }
    )

    // Re-render with updated couriers and the same region
    rerender(
      <DispatchMap
        map={{ ...sampleMapData, couriers: sampleMapData.couriers.slice(0, 1) }}
        region={{ ...sampleRegion }}
      />
    )

    // fitBounds must NOT be called again (dispatcher zoom preserved)
    expect(mockFitBounds).toHaveBeenCalledTimes(1)
  })

  it('draws no polyline, trail, earlier position, or position age (AC-13, AC-18)', () => {
    const { container } = render(<DispatchMap map={sampleMapData} region={sampleRegion} />)

    expect(screen.queryByTestId('polyline')).toBeNull()
    expect(screen.queryByTestId('trail')).toBeNull()
    // No timing or age strings like "min ago", "sec ago", "speed", "km/h"
    expect(container.textContent).not.toMatch(/(?:ago|speed|km\/h|m\/s|accuracy)/i)
  })

  it('replaces state cleanly on poll update with no accumulation or persistent storage (AC-18)', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')

    const firstAnswer: DispatchMapDto = {
      couriers: [
        {
          id: 'c-rider-alpha',
          name: 'Rider Alpha',
          latitude: 39.36,
          longitude: 22.94,
          state: 'FREE',
          carrying: [],
        },
      ],
      waitingDeliveries: [],
    }

    const { rerender } = render(<DispatchMap map={firstAnswer} region={sampleRegion} />)

    expect(screen.getByText('Rider Alpha')).toBeInTheDocument()
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(1)

    // Second poll answer: Rider Alpha is gone, Rider Beta is present
    const secondAnswer: DispatchMapDto = {
      couriers: [
        {
          id: 'c-rider-beta',
          name: 'Rider Beta',
          latitude: 39.37,
          longitude: 22.95,
          state: 'BUSY',
          carrying: [],
        },
      ],
      waitingDeliveries: [],
    }

    rerender(<DispatchMap map={secondAnswer} region={sampleRegion} />)

    // Rider Alpha's position and popup are completely gone
    expect(screen.queryByText('Rider Alpha')).toBeNull()
    // Rider Beta is present
    expect(screen.getByText('Rider Beta')).toBeInTheDocument()
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(1)

    // No localStorage or sessionStorage writes
    expect(setItemSpy).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)

    setItemSpy.mockRestore()
  })
})
