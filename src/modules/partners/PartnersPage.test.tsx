import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import PartnersPage from '@/pages/partners'
import type { PartnerAdminDto, PartnerPaginatedAdminDto } from '../../backend-admin-sdk'
import { useGetPartnersQuery } from '../../api/partnersApi'
import { useAdminPageNavigator } from '../../hooks/useAdminPageNavigator'

// The Radix UI JSDOM polyfills this suite needs now live in jest.setup.js.

// Mock DefaultLayout to avoid requiring full Redux store provider in page unit tests
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('../../api/partnersApi', () => ({
  useGetPartnersQuery: jest.fn(),
  useCreatePartnerMutation: jest.fn().mockReturnValue([jest.fn(), { isLoading: false }]),
  useUpdatePartnerMutation: jest.fn().mockReturnValue([jest.fn(), { isLoading: false }]),
}))

// Preserve EAdminRoutes enum when mocking useAdminPageNavigator hook
jest.mock('../../hooks/useAdminPageNavigator', () => {
  const actual = jest.requireActual('../../hooks/useAdminPageNavigator')
  return {
    ...actual,
    useAdminPageNavigator: jest.fn(),
  }
})

jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    pathname: '/partners',
    push: jest.fn(),
  }),
}))

const mockUseGetPartnersQuery = useGetPartnersQuery as jest.Mock
const mockUseAdminPageNavigator = useAdminPageNavigator as jest.Mock

const partnerWithAddress = {
  id: 'p1',
  name: 'Seeded Nosh Restaurant',
  phoneNumber: '+302421012345',
  email: 'nosh@volos.test',
  logo: null,
  webhookUrl: null,
  userId: 'u1',
  pickupAddress: {
    id: 'loc1',
    street: 'Ermou',
    houseNumber: '120',
    city: 'Volos',
    state: 'Thessaly',
    zipCode: '38221',
    countryCode: 'GR' as any,
    latitude: 39.3628,
    longitude: 22.9435,
    formattedAddress: 'Ermou 120, Volos, Thessaly, 38221 GR',
    createdAt: new Date(),
    stateCode: null,
  },
  // Mid month, so "Member since" reads the same in every time zone.
  createdAt: new Date('2026-03-15T10:00:00Z'),
  updatedAt: new Date('2026-03-15T10:00:00Z'),
} as unknown as PartnerAdminDto

const partnerWithoutAddress = {
  id: 'p2',
  name: 'Addressless Restaurant',
  phoneNumber: null,
  logo: null,
  webhookUrl: null,
  userId: 'u2',
  pickupAddress: null,
  email: null,
  createdAt: new Date('2026-07-15T10:00:00Z'),
  updatedAt: new Date('2026-07-15T10:00:00Z'),
} as unknown as PartnerAdminDto

const paginatedResponse = {
  data: [partnerWithAddress, partnerWithoutAddress],
  pagination: {
    page: 1,
    perPage: 10,
    totalItems: 2,
    totalPages: 1,
  },
} as unknown as PartnerPaginatedAdminDto

describe('PartnersPage index component', () => {
  const goToPartnerDetailsMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetPartnersQuery.mockReturnValue({
      data: paginatedResponse,
      isLoading: false,
    })
    mockUseAdminPageNavigator.mockReturnValue({
      goToPartnerDetails: goToPartnerDetailsMock,
      goToPartners: jest.fn(),
    })
  })

  it('renders restaurant list with exact formatted pickup address for seeded partner and "No pickup address" for addressless partner', () => {
    render(<PartnersPage />)

    expect(screen.getByText('Seeded Nosh Restaurant')).toBeInTheDocument()
    expect(screen.getByText('Addressless Restaurant')).toBeInTheDocument()

    // Assert pickup address cell text matches exact expected values
    expect(screen.getByText('Ermou 120, Volos, Thessaly, 38221 GR')).toBeInTheDocument()
    expect(screen.getByText('No pickup address')).toBeInTheDocument()
    // The addressless restaurant has no phone and no email: one "—" each (spec 0024, AC-1).
    expect(screen.getAllByText('—').length).toBe(2)
  })

  it('navigates to partner details page with exact partner id when a row is clicked', () => {
    render(<PartnersPage />)

    const firstRow = screen.getByText('Seeded Nosh Restaurant')
    fireEvent.click(firstRow)

    expect(goToPartnerDetailsMock).toHaveBeenCalledTimes(1)
    expect(goToPartnerDetailsMock).toHaveBeenCalledWith('p1')
  })

  describe('spec 0024, AC-1', () => {
    it('shows the title "Restaurants" and an "Add Restaurant" button that opens Add a Restaurant', () => {
      render(<PartnersPage />)

      expect(screen.getByRole('heading', { level: 1, name: 'Restaurants' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Add Restaurant' }))
      expect(screen.getByRole('heading', { name: 'Add a Restaurant' })).toBeInTheDocument()
    })

    it('has the columns Restaurant, Phone, Sign-in email, Member since and a sr-only "Action"', () => {
      render(<PartnersPage />)

      const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
      expect(headers).toEqual(['Restaurant', 'Phone', 'Sign-in email', 'Member since', 'Action'])
      expect(screen.getByText('Action')).toHaveClass('sr-only')
      // No search box and none of the board's figures without data.
      expect(screen.queryByRole('searchbox')).toBeNull()
      expect(screen.queryByRole('textbox')).toBeNull()
      expect(screen.queryByText(/live now/i)).toBeNull()
      expect(screen.queryByText(/today/i)).toBeNull()
      expect(screen.queryByText(/sends by/i)).toBeNull()
    })

    it('puts the pickup address under the name on one line, with its full text in the title', () => {
      render(<PartnersPage />)

      const address = screen.getByText('Ermou 120, Volos, Thessaly, 38221 GR')
      expect(address).toHaveClass('truncate')
      expect(address).toHaveAttribute('title', 'Ermou 120, Volos, Thessaly, 38221 GR')
      // Same cell as the name.
      const nameCell = screen.getByText('Seeded Nosh Restaurant').closest('td') as HTMLElement
      expect(within(nameCell).getByText('Ermou 120, Volos, Thessaly, 38221 GR')).toBeInTheDocument()
    })

    it('says "No pickup address" in the warning colour under a restaurant without one', () => {
      render(<PartnersPage />)

      const nameCell = screen.getByText('Addressless Restaurant').closest('td') as HTMLElement
      const missing = within(nameCell).getByText('No pickup address')
      expect(missing).toHaveClass('text-warning-foreground')
    })

    it('shows phone, sign-in email in mono, and "Member since" as Month YYYY of createdAt', () => {
      render(<PartnersPage />)

      const row = screen.getByText('Seeded Nosh Restaurant').closest('tr') as HTMLElement
      expect(within(row).getByText('+302421012345')).toBeInTheDocument()
      expect(within(row).getByText('nosh@volos.test')).toHaveClass('font-mono')
      expect(within(row).getByText('March 2026')).toBeInTheDocument()

      const secondRow = screen.getByText('Addressless Restaurant').closest('tr') as HTMLElement
      expect(within(secondRow).getByText('July 2026')).toBeInTheDocument()
    })

    it('Open navigates once to the restaurant (it stops the click reaching the row)', () => {
      render(<PartnersPage />)

      const row = screen.getByText('Addressless Restaurant').closest('tr') as HTMLElement
      fireEvent.click(within(row).getByRole('button', { name: 'Open' }))

      expect(goToPartnerDetailsMock).toHaveBeenCalledTimes(1)
      expect(goToPartnerDetailsMock).toHaveBeenCalledWith('p2')
    })

    it('keeps the server pagination: asks for page 1 with the default page size', () => {
      render(<PartnersPage />)

      expect(mockUseGetPartnersQuery).toHaveBeenCalledWith({ page: 1, perPage: expect.any(Number) })
    })
  })
})
