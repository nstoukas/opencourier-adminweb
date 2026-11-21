import React from 'react'
import { render, screen } from '@testing-library/react'
import { SosEmergencyContact } from './SosEmergencyContact'
import { useGetCourierAccountQuery } from '../../api/courierAccountApi'

jest.mock('../../api/courierAccountApi', () => ({
  useGetCourierAccountQuery: jest.fn(),
}))

const mockUseGetCourierAccountQuery = useGetCourierAccountQuery as jest.Mock

// Row 123: The admin SOS screen shows the rider's emergency contact so the admin knows who to call
// without leaving the alert. Done when:
// (1) while an SOS is active, the admin sees the rider's emergency contact name and phone on the SOS incident view;
// (2) a rider with none set reads as 'No emergency contact';
// (3) a test fails if the contact is dropped from that view.
describe('SosEmergencyContact (row 123)', () => {
  const courierId = 'c-volos-42'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("while an SOS is active, displays rider's emergency contact name and phone with tel: link (clause 1)", () => {
    mockUseGetCourierAccountQuery.mockReturnValue({
      currentData: {
        emergencyContactName: 'Maria Papadopoulou',
        emergencyContactPhone: '+30 694 000 0000',
      },
      isError: false,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    // Verify it asks for this courier's account
    expect(mockUseGetCourierAccountQuery).toHaveBeenCalledWith({ id: courierId })

    // Emergency contact heading is present
    expect(screen.getByRole('heading', { level: 2, name: 'Emergency contact' })).toBeInTheDocument()

    // Name is shown
    expect(screen.getByText('Maria Papadopoulou')).toBeInTheDocument()

    // Phone is a tel: link with spaces removed from the href while visible text keeps them
    const link = screen.getByRole('link', { name: '+30 694 000 0000' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'tel:+306940000000')

    // Name and phone are displayed together separated by comma
    const paragraph = screen.getByText('Maria Papadopoulou').closest('p')
    expect(paragraph).toHaveTextContent('Maria Papadopoulou, +30 694 000 0000')
    expect(screen.queryByText('No emergency contact')).not.toBeInTheDocument()
  })

  it('when rider has no contact set (null fields), displays "No emergency contact" (clause 2)', () => {
    mockUseGetCourierAccountQuery.mockReturnValue({
      currentData: {
        emergencyContactName: null,
        emergencyContactPhone: null,
      },
      isError: false,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    expect(screen.getByText('No emergency contact')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('counts a name or phone of only spaces as absent and displays "No emergency contact"', () => {
    mockUseGetCourierAccountQuery.mockReturnValue({
      currentData: {
        emergencyContactName: '   ',
        emergencyContactPhone: '   ',
      },
      isError: false,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    expect(screen.getByText('No emergency contact')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('counts empty strings as absent and displays "No emergency contact"', () => {
    mockUseGetCourierAccountQuery.mockReturnValue({
      currentData: {
        emergencyContactName: '',
        emergencyContactPhone: '',
      },
      isError: false,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    expect(screen.getByText('No emergency contact')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('when only a name is present, displays the name without comma or phone link', () => {
    mockUseGetCourierAccountQuery.mockReturnValue({
      currentData: {
        emergencyContactName: 'Giannis Antetokounmpo',
        emergencyContactPhone: null,
      },
      isError: false,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    expect(screen.getByText('Giannis Antetokounmpo')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/,/)).not.toBeInTheDocument()
    expect(screen.queryByText('No emergency contact')).not.toBeInTheDocument()
  })

  it('when only a phone is present, displays the phone link without leading comma or name', () => {
    mockUseGetCourierAccountQuery.mockReturnValue({
      currentData: {
        emergencyContactName: null,
        emergencyContactPhone: '+30 691 234 5678',
      },
      isError: false,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    const link = screen.getByRole('link', { name: '+30 691 234 5678' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'tel:+306912345678')
    expect(screen.queryByText(/,/)).not.toBeInTheDocument()
    expect(screen.queryByText('No emergency contact')).not.toBeInTheDocument()
  })

  it('trims leading and trailing spaces from contact name and phone number', () => {
    mockUseGetCourierAccountQuery.mockReturnValue({
      currentData: {
        emergencyContactName: '  Kostas Papanikolaou  ',
        emergencyContactPhone: '  +30 697 123 4567  ',
      },
      isError: false,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    expect(screen.getByText('Kostas Papanikolaou')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: '+30 697 123 4567' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'tel:+306971234567')
  })

  it('displays "Loading…" while the account data is fetching', () => {
    mockUseGetCourierAccountQuery.mockReturnValue({
      currentData: undefined,
      isError: false,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('No emergency contact')).not.toBeInTheDocument()
  })

  it('reads currentData so a second incident never shows the previous rider\'s contact while loading', () => {
    // Stale previous rider's data in cache, but currentData is undefined for this query
    mockUseGetCourierAccountQuery.mockReturnValue({
      data: {
        emergencyContactName: 'Previous Rider Emergency Contact',
        emergencyContactPhone: '+30 690 999 9999',
      },
      currentData: undefined,
      isError: false,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    // Must show Loading… and never the previous rider's contact
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('Previous Rider Emergency Contact')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('on error, renders "could not be loaded" alert with link to courier page and never reads as "No emergency contact"', () => {
    mockUseGetCourierAccountQuery.mockReturnValue({
      currentData: undefined,
      isError: true,
    })

    render(<SosEmergencyContact courierId={courierId} />)

    // Error is said in words with role="alert"
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The emergency contact could not be loaded.')

    // Link directly to courier account page
    const link = screen.getByRole('link', { name: "Open the rider's page" })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', `/couriers/${courierId}`)

    // Critical safety requirement: failed load must never read as "No emergency contact"
    expect(screen.queryByText('No emergency contact')).not.toBeInTheDocument()
  })
})
