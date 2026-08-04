import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PartnersPage from './index'
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
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z'),
} as unknown as PartnerAdminDto

const partnerWithoutAddress = {
  id: 'p2',
  name: 'Addressless Restaurant',
  phoneNumber: null,
  email: 'noaddress@volos.test',
  logo: null,
  webhookUrl: null,
  userId: 'u2',
  pickupAddress: null,
  createdAt: new Date('2026-01-02T10:00:00Z'),
  updatedAt: new Date('2026-01-02T10:00:00Z'),
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

  it('renders restaurant list with exact formatted pickup address for seeded partner and "—" for addressless partner', () => {
    render(<PartnersPage />)

    expect(screen.getByText('Seeded Nosh Restaurant')).toBeInTheDocument()
    expect(screen.getByText('Addressless Restaurant')).toBeInTheDocument()

    // Assert pickup address cell text matches exact expected values
    expect(screen.getByText('Ermou 120, Volos, Thessaly, 38221 GR')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBe(2)
  })

  it('navigates to partner details page with exact partner id when a row is clicked', () => {
    render(<PartnersPage />)

    const firstRow = screen.getByText('Seeded Nosh Restaurant')
    fireEvent.click(firstRow)

    expect(goToPartnerDetailsMock).toHaveBeenCalledTimes(1)
    expect(goToPartnerDetailsMock).toHaveBeenCalledWith('p1')
  })
})
