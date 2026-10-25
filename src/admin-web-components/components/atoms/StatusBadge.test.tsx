import React from 'react'
import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import { StatusBadge } from './StatusBadge'
import { EnumDeliveryStatus } from '../../../shared-types/delivery-events'
import { EnumCourierStatus } from '../../../shared-types/delivery'

describe('StatusBadge component', () => {
  describe('delivery statuses', () => {
    // Expected design system mappings for delivery statuses
    const EXPECTED_DELIVERY_MAPPINGS: Record<
      EnumDeliveryStatus,
      { label: string; variant: string; expectedBgClass: string }
    > = {
      [EnumDeliveryStatus.CREATED]: {
        label: 'Created',
        variant: 'secondary',
        expectedBgClass: 'bg-secondary',
      },
      [EnumDeliveryStatus.ASSIGNING_COURIER]: {
        label: 'Assigning Courier',
        variant: 'secondary',
        expectedBgClass: 'bg-secondary',
      },
      [EnumDeliveryStatus.ACCEPTED]: {
        label: 'Accepted',
        variant: 'secondary',
        expectedBgClass: 'bg-secondary',
      },
      [EnumDeliveryStatus.DISPATCHED]: {
        label: 'Dispatched',
        variant: 'secondary',
        expectedBgClass: 'bg-secondary',
      },
      [EnumDeliveryStatus.COURIER_ARRIVED_AT_PICKUP_LOCATION]: {
        label: 'Courier at Pickup',
        variant: 'secondary',
        expectedBgClass: 'bg-secondary',
      },
      [EnumDeliveryStatus.PICKED_UP]: {
        label: 'Picked Up',
        variant: 'secondary',
        expectedBgClass: 'bg-secondary',
      },
      [EnumDeliveryStatus.ON_THE_WAY]: {
        label: 'On the Way',
        variant: 'secondary',
        expectedBgClass: 'bg-secondary',
      },
      [EnumDeliveryStatus.COURIER_ARRIVED_AT_DROPOFF_LOCATION]: {
        label: 'Courier at Dropoff',
        variant: 'secondary',
        expectedBgClass: 'bg-secondary',
      },
      [EnumDeliveryStatus.DROPPED_OFF]: {
        label: 'Dropped Off',
        variant: 'default',
        expectedBgClass: 'bg-primary',
      },
      [EnumDeliveryStatus.CANCELED]: {
        label: 'Canceled',
        variant: 'destructive',
        expectedBgClass: 'bg-destructive',
      },
      [EnumDeliveryStatus.FAILED]: {
        label: 'Failed',
        variant: 'destructive',
        expectedBgClass: 'bg-destructive',
      },
    }

    // Iterating Object.values ensures every enum value has a mapped test expectation and fails if missing
    const deliveryStatusValues = Object.values(EnumDeliveryStatus)

    it.each(deliveryStatusValues)(
      'renders %s with correct label and variant from design system table',
      (status) => {
        const expected = EXPECTED_DELIVERY_MAPPINGS[status]
        expect(expected).toBeDefined()

        const { container } = render(<StatusBadge status={status} />)
        const badge = screen.getByText(expected.label)
        expect(badge).toBeInTheDocument()

        // Check background class corresponding to variant
        expect(badge.className).toContain(expected.expectedBgClass)

        // Ensure delivery status badge does NOT render a courier status dot
        const dot = container.querySelector('span[aria-hidden="true"]')
        expect(dot).toBeNull()

        // Verify exported deliveryStatuses table has exact matching entry
        expect(StatusBadge.deliveryStatuses[status]).toEqual({
          label: expected.label,
          variant: expected.variant,
        })
      }
    )
  })

  describe('courier statuses', () => {
    // Expected design system mappings for courier statuses
    const EXPECTED_COURIER_MAPPINGS: Record<
      EnumCourierStatus,
      { label: string; variant: string; dotClass: string }
    > = {
      [EnumCourierStatus.ONLINE]: {
        label: 'Online',
        variant: 'success',
        dotClass: 'bg-success',
      },
      [EnumCourierStatus.LAST_CALL]: {
        label: 'Last Call',
        variant: 'warning',
        dotClass: 'bg-warning',
      },
      [EnumCourierStatus.OFFLINE]: {
        label: 'Offline',
        variant: 'outline',
        dotClass: 'bg-destructive',
      },
    }

    const courierStatusValues = Object.values(EnumCourierStatus)

    it.each(courierStatusValues)(
      'renders kind="courier" %s with label, variant, and aria-hidden dot',
      (status) => {
        const expected = EXPECTED_COURIER_MAPPINGS[status]
        expect(expected).toBeDefined()

        const { container } = render(<StatusBadge kind="courier" status={status} />)
        const badge = screen.getByText(expected.label)
        expect(badge).toBeInTheDocument()

        // Check aria-hidden dot presence and styling
        const dot = container.querySelector('span[aria-hidden="true"]')
        expect(dot).not.toBeNull()
        expect(dot?.className).toContain(expected.dotClass)

        // Verify exported courierStatuses table
        expect(StatusBadge.courierStatuses[status]).toEqual({
          label: expected.label,
          variant: expected.variant,
        })
      }
    )
  })

  describe('unknown status fallback', () => {
    it('renders unknown value SOME_NEW_STATUS as sentence case on secondary', () => {
      const { container } = render(<StatusBadge status="SOME_NEW_STATUS" />)
      const badge = screen.getByText('Some new status')
      expect(badge).toBeInTheDocument()
      expect(badge.className).toContain('bg-secondary')

      // No dot for default delivery kind
      expect(container.querySelector('span[aria-hidden="true"]')).toBeNull()
    })

    it('renders unknown value SOME_NEW_STATUS with dot when kind is courier', () => {
      const { container } = render(<StatusBadge kind="courier" status="SOME_NEW_STATUS" />)
      expect(screen.getByText('Some new status')).toBeInTheDocument()
      const dot = container.querySelector('span[aria-hidden="true"]')
      expect(dot).not.toBeNull()
    })
  })

  describe('exported status tables', () => {
    it('exports deliveryStatuses and courierStatuses on StatusBadge', () => {
      expect(StatusBadge.deliveryStatuses).toBeDefined()
      expect(StatusBadge.courierStatuses).toBeDefined()
      expect(Object.keys(StatusBadge.deliveryStatuses).length).toBe(
        Object.values(EnumDeliveryStatus).length
      )
      expect(Object.keys(StatusBadge.courierStatuses).length).toBe(
        Object.values(EnumCourierStatus).length
      )
    })
  })

  describe('page usage and source scan', () => {
    const rootDir = path.resolve(__dirname, '../../../../')
    const deliveriesPagePath = path.resolve(rootDir, 'src/pages/deliveries/index.tsx')
    const couriersPagePath = path.resolve(rootDir, 'src/pages/couriers/index.tsx')
    const deliveryDetailsPath = path.resolve(
      rootDir,
      'src/modules/deliveries/components/DeliveryDetails.tsx'
    )
    const oldStatusBadgePath = path.resolve(
      rootDir,
      'src/modules/deliveries/components/StatusBadge.tsx'
    )
    const oldCourierStatusBadgePath = path.resolve(
      rootDir,
      'src/modules/deliveries/components/CourierStatusBadge.tsx'
    )

    it('confirms src/pages/deliveries/index.tsx imports StatusBadge from barrel and uses <StatusBadge', () => {
      const content = fs.readFileSync(deliveriesPagePath, 'utf8')
      expect(content).toMatch(/import\s*\{[^}]*StatusBadge[^}]*\}\s*from\s*['"].*admin-web-components['"]/)
      expect(content).toContain('<StatusBadge')
    })

    it('confirms src/pages/couriers/index.tsx imports StatusBadge from barrel and uses <StatusBadge', () => {
      const content = fs.readFileSync(couriersPagePath, 'utf8')
      expect(content).toMatch(/import\s*\{[^}]*StatusBadge[^}]*\}\s*from\s*['"].*admin-web-components['"]/)
      expect(content).toContain('<StatusBadge')
    })

    it('confirms DeliveryDetails imports StatusBadge from barrel', () => {
      const content = fs.readFileSync(deliveryDetailsPath, 'utf8')
      expect(content).toMatch(/import\s*\{[^}]*StatusBadge[^}]*\}\s*from\s*['"].*admin-web-components['"]/)
      expect(content).toContain('<StatusBadge')
    })

    it('confirms the old StatusBadge.tsx and CourierStatusBadge.tsx no longer exist', () => {
      expect(fs.existsSync(oldStatusBadgePath)).toBe(false)
      expect(fs.existsSync(oldCourierStatusBadgePath)).toBe(false)
    })
  })
})
