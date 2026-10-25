import React from 'react'
import { render } from '@testing-library/react'
import { PartnerSummaryCard } from './PartnerSummaryCard'
import type { PartnerAdminDto } from '@/backend-admin-sdk'
import { formatDate } from '@/ui-shared-utils'

describe('PartnerSummaryCard component', () => {
  const sampleCreatedAt = new Date(2026, 6, 10, 12, 25) // July 10, 2026 12:25

  const samplePartnerWithAddress: PartnerAdminDto = {
    id: 'partner-123',
    name: 'Volos Test Kitchen',
    email: 'kitchen@example.com',
    phoneNumber: null, // missing phone
    webhookUrl: null, // missing webhook
    logo: null,
    userId: 'user-123',
    pickupAddress: {
      id: 'loc-123',
      street: 'Iasonos',
      houseNumber: '42',
      addressLine1: 'Iasonos 42',
      addressLine2: null,
      city: 'Volos',
      state: 'Thessaly',
      stateCode: null,
      zipCode: '38221',
      countryCode: 'GR',
      latitude: 39.3621,
      longitude: 22.9423,
      formattedAddress: 'Iasonos 42, Volos 38221, Greece',
      createdAt: sampleCreatedAt,
    },
    createdAt: sampleCreatedAt,
    updatedAt: sampleCreatedAt,
  }

  it('renders facts through DetailList with em dash for missing phone and webhook', () => {
    const { container } = render(<PartnerSummaryCard partner={samplePartnerWithAddress} />)

    // Ensure a dl is rendered
    const dl = container.querySelector('dl')
    expect(dl).not.toBeNull()

    const dts = Array.from(container.querySelectorAll('dt')).map((dt) => dt.textContent)
    const dds = Array.from(container.querySelectorAll('dd'))

    // Assert exact dt labels
    expect(dts).toEqual([
      'Login Email',
      'Phone Number',
      'Pickup Address',
      'Coordinates (Lat, Lng)',
      'Webhook URL',
      'Created',
    ])

    // Login Email
    expect(dds[0]?.textContent).toBe('kitchen@example.com')
    expect(dds[0]?.className).toContain('font-mono')

    // Phone Number (missing -> em dash)
    expect(dds[1]?.textContent).toBe('—')

    // Pickup Address
    expect(dds[2]?.textContent).toBe('Iasonos 42, Volos 38221, Greece')

    // Coordinates (Lat, Lng)
    expect(dds[3]?.textContent).toBe('39.3621, 22.9423')
    expect(dds[3]?.className).toContain('font-mono')

    // Webhook URL (missing -> em dash)
    expect(dds[4]?.textContent).toBe('—')
    expect(dds[4]?.className).toContain('font-mono')

    // Created
    expect(dds[5]?.textContent).toBe(formatDate(sampleCreatedAt))
  })

  it('renders em dash for Coordinates and Pickup Address when pickupAddress is null', () => {
    const partnerNoAddress: PartnerAdminDto = {
      ...samplePartnerWithAddress,
      phoneNumber: '+30 24210 12345',
      webhookUrl: 'https://example.com/webhook',
      pickupAddress: null,
    }

    const { container } = render(<PartnerSummaryCard partner={partnerNoAddress} />)
    const dds = Array.from(container.querySelectorAll('dd'))

    // Phone Number is present
    expect(dds[1]?.textContent).toBe('+30 24210 12345')

    // Pickup Address is missing -> em dash
    expect(dds[2]?.textContent).toBe('—')

    // Coordinates (Lat, Lng) is null -> em dash
    expect(dds[3]?.textContent).toBe('—')

    // Webhook URL is present
    expect(dds[4]?.textContent).toBe('https://example.com/webhook')
  })
})
